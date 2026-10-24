var CACHE = 'verb-lab-v40-v1';
var ASSETS = [
  './index.html',
  './assets/styles.css',
  './assets/app.js',
  './manifest.webmanifest',
  './data/curriculum.json',
  './data/verbs.json',
  './data/prep.json',
  './data/pronunciation.json',
  './data/br-tips.json',
  './data/collocations.json',
  './data/micro-keep.json',
  './data/stative.json',
  './data/alt-forms.json',
  './data/lessons/present-simple.json',
  './data/lessons/present-continuous.json',
  './data/lessons/present-perfect.json',
  './data/lessons/present-perfect-continuous.json',
  './data/lessons/past-simple.json',
  './data/lessons/past-continuous.json',
  './data/lessons/past-perfect.json',
  './data/lessons/past-perfect-continuous.json',
  './data/lessons/future-simple.json',
  './data/lessons/future-continuous.json',
  './data/lessons/future-perfect.json',
  './data/lessons/future-perfect-continuous.json',
  './data/lessons/going-to.json',
  './data/lessons/present-for-future.json',
  './data/lessons/modals.json',
  './data/lessons/conditionals.json',
  './data/lessons/passive.json',
  './data/lessons/verb-patterns.json',
  './data/lessons/phrasal-verbs.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS).catch(function (err) {
        console.warn('SW: asset prefetch falhou (ok se ainda não publicado):', err);
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (resp) {
      if (resp) return resp;
      return fetch(event.request).then(function (r) {
        if (r && r.status === 200 && event.request.method === 'GET') {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(event.request, copy); });
        }
        return r;
      });
    }).catch(function () {
      return caches.match('./index.html').then(function (r) { return r; });
    })
  );
});
