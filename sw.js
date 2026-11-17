/* 서비스 워커: 오프라인에서도 마지막으로 본 화면과 기사 목록이 열리게 한다.
 * 같은 출처의 파일은 '네트워크 우선, 실패하면 캐시'라서 온라인일 때는 항상 최신이다.
 * 구조를 크게 바꿀 때는 VERSION을 올리면 옛 캐시가 지워진다. */
var VERSION = 'v2';
var CACHE = 'daily-news-' + VERSION;
var SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens.css', 'css/layout.css', 'css/components.css', 'css/responsive.css',
  'js/util.js', 'js/store.js', 'js/feed.js', 'js/pick.js', 'js/reco.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // 폰트·외부 링크는 건드리지 않음
  e.respondWith(
    fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
    })
  );
});
