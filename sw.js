const CACHE="achim-tracker-v2";
const ASSETS=["./","./index.html","./app.js","./manifest.webmanifest","./sw.js"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener("fetch",(e)=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
