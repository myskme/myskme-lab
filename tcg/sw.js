/* 百变萌友 TCG · Service Worker v4.0 (682)
 * 策略：
 * - 图片：缓存优先（Cache-first），首次加载后存本地，之后秒开
 * - HTML：网络优先（Network-first），保证拿到最新版，离线时回退缓存
 * - 增量更新：版本号变化时旧缓存自动清理
 */
const CACHE_NAME = 'tcg-v4.0';
const CORE_FILES = [
  './开卡包.html',
  './图鉴.html',
  './卡背-百变萌友-正式.jpg'
];

// 安装：预缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 图片：缓存优先
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML/其他：网络优先，离线回退缓存
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
