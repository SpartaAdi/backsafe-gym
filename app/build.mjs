// Builds the standalone home-screen web app (PWA) from app.html into ./dist
// Usage: node app/build.mjs  (writes the site to ./docs, which GitHub Pages serves)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'docs');
mkdirSync(out, { recursive: true });
const VERSION = 'v' + new Date().toISOString().replace(/\D/g, '').slice(0, 12);

const body = readFileSync(join(here, 'app.html'), 'utf8')
  .replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '');

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0A2540">
<meta name="description" content="84-day back-safe gym plan tracker">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Back-Safe">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
`;
// app.html starts with <title>/<link>/<style>; they belong in <head>. Split at the first <header>.
const cut = body.indexOf('<header');
const html = head + body.slice(0, cut) + '</head>\n<body>\n' + body.slice(cut) +
  `\n<script>if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>\n</body>\n</html>\n`;
writeFileSync(join(out, 'index.html'), html);

writeFileSync(join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Back-Safe Gym Plan',
  short_name: 'Back-Safe',
  start_url: './index.html#today',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F5F5F5',
  theme_color: '#0A2540',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}, null, 2));

writeFileSync(join(out, 'sw.js'), `// Offline cache for the Back-Safe app. Bump on each build: ${VERSION}
const CACHE='backsafe-${VERSION}';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    // network first for the page so updates arrive; cache fallback offline
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));
  } else if(/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));return res})));
  }
});
`);

// ---- PNG icons: navy square, yellow dumbbell (matches the in-app mark) ----
function crcTable() { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
const CRC = crcTable();
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); }
function png(size) {
  const bg = [0x0a, 0x25, 0x40], fg = [0xf9, 0xc6, 0x42];
  const s = size / 24; // draw on the same 24-unit grid as the SVG mark, centred with padding
  const scale = 0.62, off = size * (1 - scale) / 2, u = s * scale;
  const bars = [ // [x, y1, y2] vertical strokes; plus a horizontal bar
    [3, 9, 15], [6, 7, 17], [18, 7, 17], [21, 9, 15]
  ];
  const sw = 2.6 * u / 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = (x + 0.5 - off) / u, gy = (y + 0.5 - off) / u;
      let on = false;
      for (const [bx, y1, y2] of bars) {
        const cy = Math.max(y1, Math.min(y2, gy));
        if (Math.hypot(gx - bx, gy - cy) * u <= sw) on = true;
      }
      const cx = Math.max(6, Math.min(18, gx));
      if (Math.hypot(gx - cx, gy - 12) * u <= sw) on = true;
      const c = on ? fg : bg, i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync(join(out, 'icon-192.png'), png(192));
writeFileSync(join(out, 'icon-512.png'), png(512));
writeFileSync(join(out, 'apple-touch-icon.png'), png(180));
console.log('Built', out, VERSION);
