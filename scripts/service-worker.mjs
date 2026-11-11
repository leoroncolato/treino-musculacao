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
async function mediaResponse(request) {
  const cache = await caches.open(CACHE);
  // Store complete files, never partial 206 responses. This also lets a video
  // loaded once seek and replay offline through byte-range requests.
  const fullRequest = new Request(request.url, { credentials: 'same-origin' });
  let response = await cache.match(fullRequest);
  if (!response) {
    response = await fetch(fullRequest);
    if (response.status === 200) await cache.put(fullRequest, response.clone());
  }
  const range = request.headers.get('Range');
  if (!range || response.status !== 200) return response;
  const match = /^bytes=(\\d*)-(\\d*)$/.exec(range);
  const bytes = await response.arrayBuffer(), size = bytes.byteLength;
  if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  const headers = new Headers(response.headers);
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==self.location.origin||event.request.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.startsWith('/cdn-cgi/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/')));return;}
if(u.pathname.startsWith('/media/exercises/')){event.respondWith(mediaResponse(event.request));return;}
// Static Assets varies by Origin; install requests and module requests have
// different Origin headers. These named same-origin public files are identical.
if(ASSETS.includes(u.pathname))event.respondWith(caches.match(event.request,{ignoreVary:true}).then(hit=>hit||fetch(event.request)));});`,
);
console.log("Offline shell generated:", version);
