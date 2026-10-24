'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname);
const MIME = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  let file = path.join(ROOT, decodeURIComponent(p));
  try {
    const data = fs.readFileSync(file);
    res.writeHead(200, {'Content-Type': (MIME[path.extname(file)]||'application/octet-stream')});
    res.end(data);
  } catch (e) {
    res.writeHead(404, {'Content-Type':'text/plain'}); res.end('404');
  }
}).listen(8370, () => console.log('http://localhost:8370'));
