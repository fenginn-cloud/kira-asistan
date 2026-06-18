// Minimal static server for the exported web build (dist/). Dev/preview only.
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dist');
const port = process.env.PORT || 8090;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

http
  .createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let fp = path.join(dir, reqPath);
    if (!fp.startsWith(dir)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      fp = path.join(dir, 'index.html'); // SPA fallback
    }
    fs.readFile(fp, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('404');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`serving dist on http://localhost:${port}`));
