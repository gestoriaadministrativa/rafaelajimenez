const CACHE="gestoria-rafaela-v1";
const CORE=["./","./index.html","./styles.css","./app.js","./manifest.json","./assets/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url);
  // No cachear llamadas de Supabase, autenticación ni documentos privados.
  if(url.origin!==self.location.origin || url.pathname.includes("/rest/") || url.pathname.includes("/storage/"))return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));
});