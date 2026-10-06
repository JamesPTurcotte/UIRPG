// Opens the GitHub Pages site.
const { spawn } = require('child_process');

const target = 'https://jamespturcotte.github.io/UIRPG/';

function openBrowser(url) {
  let child;
  if (process.platform === 'darwin') child = spawn('open', [url], { detached: true, stdio: 'ignore' });
  else if (process.platform === 'win32') child = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
  else child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
  child.on('error', () => console.log('Open this in a browser: ' + url));
  child.unref();
}

openBrowser(target);
console.log('Opened ' + target);
