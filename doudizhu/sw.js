/* 萌友斗地主 Service Worker · v2.2.4
   策略: 游戏 HTML 网络优先(保证新版及时到达, 失败回退缓存);
         静态资产(牌图/头像/桌布/音乐/图标)缓存优先, 首次用到即存运行时缓存。
   !! 发版纪律: 每次发版必须 bump 下方 CACHE 版本号(见 发版清单-PWA.md), 否则旧缓存不刷新 !! */
const CACHE = 'ddz-v2.3.0';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.indexOf('ddz-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 跨域(联机接口等)不拦截

  const isDoc = req.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('/index.html');

  if (isDoc) {
    // HTML: 网络优先, 成功顺手刷新缓存; 断网回退缓存
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => { c.put('./index.html', copy); }).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // 静态资产: 缓存优先, 未命中回源并入缓存(牌图/音乐首次用到即存)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => { c.put(req, copy); }).catch(() => {});
        }
        return res;
      });
    })
  );
});
