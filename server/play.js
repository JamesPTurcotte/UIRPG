// Opens index.html in the browser. The game runs from that file.
const { spawn } = require('child_process');
const path = require('path');
const { pathToFileURL } = require('url');

const index = path.join(__dirname, '..', 'index.html');
const target = pathToFileURL(index).href;

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
