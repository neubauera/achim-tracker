const CACHE="achim-tracker-v4";
const ASSETS=["./","./index.html","./app.js","./manifest.webmanifest","./sw.js"];
self.addEventListener("install",(e)=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener("activate",(e)=>{ e.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k.startsWith("achim-tracker-")&&k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener("fetch",(e)=>{ const url=new URL(e.request.url);
  if(e.request.mode==="navigate"||url.pathname.endsWith("/index.html")){
    e.respondWith((async()=>{ try{ const fresh=await fetch(e.request,{cache:"no-store"}); const cache=await caches.open(CACHE); cache.put(e.request,fresh.clone()); return fresh; }catch{ const cached=await caches.match(e.request); return cached||caches.match("./index.html"); } })());
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
