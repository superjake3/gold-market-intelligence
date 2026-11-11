const CACHE="gold-fx-static-v13";
const ASSETS=["./","./index.html","./styles.css","./app.js","./insights.js","./manifest.webmanifest","./assets/icon.svg"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(url.origin!==location.origin || request.method!=="GET") return;

  // Live quote JSON must always come directly from the network.
  if(url.pathname.endsWith("/data/live-market.json") || url.pathname.endsWith("/data/economic-indicators.json")){
    event.respondWith(fetch(request,{cache:"no-store"}));
    return;
  }

  // Prefer the latest deployed dashboard files; fall back to cache offline.
  const isAppFile=/\/(?:index\.html|app\.js|insights\.js|styles\.css|sw\.js)$/.test(url.pathname)
    || url.pathname.endsWith("/gold-market-intelligence/");
  if(isAppFile){
    event.respondWith(
      fetch(request,{cache:"no-store"})
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(request,copy));
          }
          return response;
        })
        .catch(()=>caches.match(request).then(cached=>cached||Response.error()))
    );
    return;
  }

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
