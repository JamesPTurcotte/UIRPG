const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const base = process.env.BASE || 'http://127.0.0.1:4173';
const out = path.join(__dirname, 'shots');
fs.mkdirSync(out, { recursive: true });

function assert(name, cond, detail) {
  if (cond) {
    console.log('ok  ' + name);
    return;
  }
  console.error('FAIL ' + name + (detail ? ' ' + detail : ''));
  process.exitCode = 1;
}

async function overflow(page) {
  return page.evaluate(() => {
    const shell = document.getElementById('shell');
    const shellRect = shell.getBoundingClientRect();
    const problems = [];
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
      problems.push('document x-scroll ' + document.documentElement.scrollWidth);
    }
    if (document.documentElement.scrollHeight > window.innerHeight + 1 && document.body.scrollHeight > window.innerHeight + 1) {
      const bodyScroll = getComputedStyle(document.body).overflow;
      if (bodyScroll !== 'hidden') problems.push('body can scroll');
    }
    const nodes = Array.from(document.querySelectorAll('#shell *'));
    nodes.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const outside = rect.right > shellRect.right + 2 || rect.left < shellRect.left - 2
        || rect.bottom > shellRect.bottom + 2 || rect.top < shellRect.top - 2;
      if (!outside) return;
      let parent = el.parentElement;
      let clipped = false;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        const clips = ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflow)
          || ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)
          || ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY);
        if (clips) {
          const prect = parent.getBoundingClientRect();
          const parentInside = prect.right <= shellRect.right + 2 && prect.left >= shellRect.left - 2
            && prect.bottom <= shellRect.bottom + 2 && prect.top >= shellRect.top - 2;
          if (parentInside) clipped = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!clipped) {
        const label = (el.id || el.className || el.tagName).toString().slice(0, 80);
        problems.push('escapes ' + label);
      }
    });
    return problems.slice(0, 12);
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: false });
  const problems = await overflow(page);
  assert(name + ' stays inside the shell', problems.length === 0, JSON.stringify(problems));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);

  async function login(email, password, name) {
    await page.goto(base, { waitUntil: 'networkidle0' });
    await page.type('#email', email);
    await page.type('#password', password);
    if (name) await page.type('#name', name);
    await page.click('[data-act="register"]');
    await page.waitForSelector('#table-screen, #auth-error', { timeout: 4000 });
  }

  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await shot(page, 'desktop-login');

  const stamp = Date.now();
  const player = `player${stamp}@play.test`;
  await login(player, 'password1', 'Ada');
  const hasAdmin = await page.$('[data-act="open-admin"]');
  assert('player does not see add content', !hasAdmin);
  await shot(page, 'desktop-table');

  await page.click('[data-act="new-run"]');
  await page.click('[data-act="pick-class"][data-id="fighter"]');
  for (let i = 0; i < 6; i++) {
    await page.waitForSelector('[data-act="roll-ability"]');
    await page.click('[data-act="roll-ability"]');
    await page.waitForSelector('#dice .pip');
    const pip = await page.$eval('#dice .pip', el => el.textContent.trim());
    assert('die face is a number', /^[0-9]+$/.test(pip), pip);
    await new Promise(resolve => setTimeout(resolve, 750));
    await shot(page, 'desktop-dice-' + i);
    await page.keyboard.press('Space');
  }
  await page.waitForSelector('[data-act="hold-roll"]');
  await shot(page, 'desktop-assign');
  const rolls = await page.$$eval('[data-act="hold-roll"]', nodes => nodes.map(node => ({
    index: Number(node.dataset.index),
    value: Number(node.dataset.value),
  })));
  const order = rolls.slice().sort((a, b) => b.value - a.value || a.index - b.index);
  const place = { cha: order[0], dex: order[1], con: order[2], str: order[3], wis: order[4], int: order[5] };
  for (const ability of Object.keys(place)) {
    await page.click(`[data-act="hold-roll"][data-index="${place[ability].index}"]`);
    await page.click(`[data-act="place"][data-ability="${ability}"]`);
  }
  await page.click('[data-act="confirm-assign"]');
  await page.waitForSelector('#page .prose');
  const theme = await page.$eval('.map-label', el => el.textContent);
  assert('floor 1 is a theme that has rooms', /Crypt/.test(theme), theme);
  await page.hover('[data-dir="next"]');
  const doorLit = await page.$('.room-node.hot');
  assert('hovering a passage highlights that room', !!doorLit);
  await shot(page, 'desktop-floor');

  await page.evaluate(() => {
    const prose = document.querySelector('#page .prose');
    prose.textContent = ('A long sentence about the crypt gate and the cold. ').repeat(40)
      + 'Supercalifragilisticwordwithoutspaces'.repeat(8);
  });
  await shot(page, 'desktop-long-prose');

  await page.click('[data-dir="next"]');
  await page.waitForSelector('[data-act="option"]');
  await page.click('[data-act="option"]');
  await page.waitForSelector('[data-act="battle"]');
  await page.waitForSelector('#dice .pip');
  await new Promise(resolve => setTimeout(resolve, 800));
  await shot(page, 'desktop-battle');
  await page.keyboard.press('Space');
  await page.evaluate(() => { Math.random = () => 0; });
  await page.click('[data-act="battle"][data-id="attack"]');
  await page.waitForSelector('#dice .pip');
  await new Promise(resolve => setTimeout(resolve, 800));
  await shot(page, 'desktop-attack');
  await page.keyboard.press('Space');
  await page.evaluate(() => { Math.random = () => 0.99; });
  await page.click('[data-act="battle"][data-id="flee"]');
  await page.waitForSelector('#dice .pip');
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-dir="next"]');
  await page.click('[data-dir="next"]');
  await page.waitForSelector('[data-act="descend"]');
  await shot(page, 'desktop-stairs');
  await page.click('[data-act="descend"]');
  await page.waitForSelector('[data-dir="next"]');
  await page.click('[data-dir="next"]');
  await page.waitForSelector('[data-dir="right"]');
  await page.click('[data-dir="right"]');
  const charm = await page.waitForSelector('[data-act="option"]');
  const charmText = await page.evaluate(el => el.textContent, charm);
  assert('a charm option shows the check', /DC/.test(charmText), charmText);
  await page.hover('[data-act="option"]');
  const abilityLit = await page.$('.ability.lit');
  assert('hovering a check highlights the ability', !!abilityLit);
  await charm.click();
  await page.waitForSelector('#dice .pip');
  await new Promise(resolve => setTimeout(resolve, 800));
  const checkText = await page.$eval('#dice .formula', el => el.textContent);
  assert('the charm roll settles in the tray', /CHA/.test(checkText) && /DC|Success|Fail/.test(checkText), checkText);
  await shot(page, 'desktop-check');
  await page.keyboard.press('Space');

  await page.setViewport({ width: 390, height: 844 });
  await shot(page, 'phone-play');
  await page.goto(base, { waitUntil: 'networkidle0' });
  await shot(page, 'phone-resume');

  await page.click('[data-act="logout"]');
  await page.waitForSelector('#email');
  await page.type('#email', player);
  await page.type('#password', 'password1');
  await page.click('[data-act="login"]');
  await page.waitForSelector('#table-screen, #page');
  const still = await page.evaluate(() => ({
    cont: !!document.querySelector('[data-act="continue"]'),
    prose: !!document.querySelector('#page .prose, #page .battle-head, [data-act="descend"]'),
    battle: !!document.querySelector('[data-act="battle"]'),
  }));
  assert('login returns to the same run', still.cont || still.prose || still.battle);
  await shot(page, 'phone-return');

  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.evaluate(() => fetch('/api/logout', { method: 'POST' }));
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.type('#email', 'admin@table.local');
  await page.type('#password', 'password1');
  await page.click('[data-act="login"]');
  await page.waitForSelector('[data-act="open-admin"]');
  await page.click('[data-act="open-admin"]');
  await page.waitForSelector('#entry');
  const adminHeading = await page.$eval('#admin h2', el => el.textContent);
  assert('admin form is open', adminHeading === 'Add content', adminHeading);
  await shot(page, 'desktop-admin');

  await browser.close();
  if (process.exitCode) process.exit(process.exitCode);
  console.log('visual checks passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
