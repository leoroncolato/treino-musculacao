import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = ".cloudflare/output/v0/workers/default/assets";
const files = await readdir(`${root}/assets`);
const assets = files
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => `/assets/${f}`);
const version = createHash("sha256")
  .update(await readFile(`${root}/index.html`))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  `${root}/sw.js`,
  `const CACHE='bella-${version}';
const ASSETS=${JSON.stringify(["/", ...assets])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bella-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==self.location.origin||event.request.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/cdn-cgi/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/')));return;}
if(ASSETS.includes(u.pathname)||u.pathname.startsWith('/media/exercises/'))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return response;})));});`,
);
console.log("Offline shell generated:", version);
