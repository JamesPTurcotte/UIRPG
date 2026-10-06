// Starts the game server, then opens it in the browser.
// If the server is already running, this only opens the browser.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT) || 4173;
const url = 'http://127.0.0.1:' + port;

function openBrowser(target) {
  let child;
  if (process.platform === 'darwin') child = spawn('open', [target], { detached: true, stdio: 'ignore' });
  else if (process.platform === 'win32') child = spawn('cmd', ['/c', 'start', '', target], { detached: true, stdio: 'ignore', windowsHide: true });
  else child = spawn('xdg-open', [target], { detached: true, stdio: 'ignore' });
  child.on('error', () => console.log('Open this in a browser: ' + target));
  child.unref();
}

function ping() {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      res.resume();
      resolve(res.statusCode && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(400, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServer() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (await ping()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - started > 8000) {
        clearInterval(timer);
        reject(new Error('Server did not answer on ' + url));
      }
    }, 200);
  });
}

async function main() {
  if (await ping()) {
    openBrowser(url);
    console.log('Already running. Opened ' + url);
    return;
  }
  const child = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', code => process.exit(code || 0));
  try {
    await waitForServer();
  } catch (err) {
    console.error(err.message);
    child.kill();
    process.exit(1);
  }
  openBrowser(url);
  console.log('Opened ' + url);
}

main();
