// Service Worker der Trainings-PWA.
// Precache-Liste und Version werden von `npm run sw` erzeugt (scripts/update-sw.mjs). Nicht von Hand pflegen.
// Strategie: App-Dateien aus dem eigenen Cache (offline), alles andere direkt aus dem Netz, nichts zur Laufzeit cachen.
// Fremde Origins werden nicht angefasst. Neue Versionen warten, bis die App "Aktualisieren" sendet.
// Integrität: Jede Datei wird gegen ihren SHA-256 geprüft, beim Installieren und bei jeder Auslieferung aus dem Cache.
// So kann eine andere Seite derselben Origin (z. B. ein weiteres GitHub-Pages-Projekt) den Cache nicht unbemerkt verändern.

const VERSION = '2a26e7506148';
const PRECACHE = [
  './',
  './css/app.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './manifest.webmanifest',
  './src/agent-prompt.js',
  './src/app.js',
  './src/dom.js',
  './src/export.js',
  './src/format.js',
  './src/garmin/categories.js',
  './src/garmin/fit.js',
  './src/garmin/session-fit.js',
  './src/legal.js',
  './src/model/backup.js',
  './src/model/csv.js',
  './src/model/finish.js',
  './src/model/history.js',
  './src/model/id.js',
  './src/model/import.js',
  './src/model/live.js',
  './src/model/plan.js',
  './src/model/progression.js',
  './src/model/training-file.js',
  './src/model/validate.js',
  './src/model/weeks.js',
  './src/sound.js',
  './src/storage.js',
  './src/version.js',
  './src/views/history.js',
  './src/views/info.js',
  './src/views/live.js',
  './src/views/plan.js',
  './src/wakelock.js',
];
const HASHES = {
  './': '850102ee399c44f8cc9d2391b69fc80714973d2995756b52536b98657a911b71',
  './css/app.css': 'be66742f3db8bca8d126195ca5a9d08171f032cdc3c27df756bb9e6195a620b0',
  './icons/apple-touch-icon.png': '95a58253706751a489d47b83b541fbee83704061b21d7e3b865e177b44c09794',
  './icons/icon-192.png': '8065ebd975e57b644b3e911a8593dc63e3ec54bdb7e448a639c32a2e2b7c627d',
  './icons/icon-512.png': 'dab98636df3ce42fbc2d8d2b62476f8c61d4f7edd2553ce01395c8938677c536',
  './icons/icon-maskable-512.png': '95981515b9a3335f597f80d0302b4b24868f574afb9d06f68595138f6e593e6d',
  './index.html': '850102ee399c44f8cc9d2391b69fc80714973d2995756b52536b98657a911b71',
  './manifest.webmanifest': '275106e6dd0870288575a782db8624a9e562503ca1b028f9e7b8d488a13eb5bf',
  './src/agent-prompt.js': '60a0027d31a2d3b4f7634c71c5c28fac959ca6cc3877353210c5f166e0e9607e',
  './src/app.js': '5dd3614151d2b9b931ad3a989f3d2535bfe0529dde5d79d77430428d07c4e248',
  './src/dom.js': '921a23af64da7b2806ba47122b6f4f96866f4fbc0b8b7ec311c32de164eb0470',
  './src/export.js': '4681ef52d649ec755de11a3ef6e08ffbb659934b69c79c9bdf39ab9784d0dc0f',
  './src/format.js': '1d76cc1642fd5089ba43b157ec99f67d4a2473d142dda37ef9e3a6ef785d6d26',
  './src/garmin/categories.js': 'dfb3e423ac9470e6416920600cb45550496d40e289473425f31ed1ad2daf32fa',
  './src/garmin/fit.js': '847268996bab34f2fec4c3c2c343cf54e61d463996dd8dff4385418fdb1699dd',
  './src/garmin/session-fit.js': '9c2785111c3ebda2d498c45904c5dcfb795aea3cb1468f81aee9d9250b9591cb',
  './src/legal.js': '3f266beabb52b32a7bccfb9ae752b7d7684ad1b532ece5f833024d3125eb80ec',
  './src/model/backup.js': '404c698733283398b7578418510208abdefeab4f23c7ec59704c8758591f31e0',
  './src/model/csv.js': 'e102e34bd6b7925f67944688b1aa4c028dd178360b55828fe1ba4968929cf0ac',
  './src/model/finish.js': '60d3f816729ac67505bab4203fee1cf3ca85f3187e772ffaacd32892e9a84702',
  './src/model/history.js': '1f4768a838c54bdb0fdf522e76f187f9fd9b7775ca50a30f89d30df99ec8e2ce',
  './src/model/id.js': '8389633fb754df04c6d6e10acb2779a427bd3123513feedb818624afcef3a98b',
  './src/model/import.js': 'd41f9a3ddcdbe797d9c35b30e7a6acc3220ccf0fde82457cd0e49db671ea3284',
  './src/model/live.js': 'ebf107a2ba6f3db2d66dd0a35dfa20182ed2bc6e1e4f2a3f5af082c6e4290ced',
  './src/model/plan.js': '21e4139da0cab77b14b9a2e1c2f4327ec0b7fd2752f5bfa5e7f1b0e32260b99c',
  './src/model/progression.js': 'faf6227552207f74dc01e5b60a78514869a2327c5b1383e0090c815025412c05',
  './src/model/training-file.js': 'ef8acf49d639d1d6a70f40a1063f671b5bb13272b175614bdd43864e7f58adcf',
  './src/model/validate.js': '8e62572473060f970171ce1fd63dace1697d72c9db1e77c85027e09dea4b466d',
  './src/model/weeks.js': 'd05245a09b68fecd4bc81b07da718bcb156c0be54f295f41dbe26006b54e7520',
  './src/sound.js': '02cf03e9826a090dae8162f57f34488d26a401a134a2e8598ba38d03867c447d',
  './src/storage.js': '2a6c810c1c84aa4bbc527b6025151d80cecc978ba6ecd4ad78ae3bf26beb2e63',
  './src/version.js': '5c30315b6f9ab1df4c1933d2a3917de8f60a5b1e32d4b80bdcbd809d099ecf17',
  './src/views/history.js': 'c0a77f80ea17f01151d45a9e19faf7f5413ab4cfe467721d1c6b73c67836bf8c',
  './src/views/info.js': '93376de64bf4622330a76d0cd9e1116f29a97b32115492136dd2a278b00e6ebe',
  './src/views/live.js': '944705bd80229f03765f13f2df3c8fa92dec5aa4e56871c5919d3280c8d71803',
  './src/views/plan.js': '58c0670629578c0b3fa4e889385b1255a65100fe04a9c958cbf84ce457437a3f',
  './src/wakelock.js': '9a1eb64fd0643be7b6a0558265549f7a8aac7a14920303e9dbd75caca64380aa',
};
const PREFIX = 'training-pwa-';
const CACHE = `${PREFIX}${VERSION}`;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function matches(res, key) {
  if (!res || !res.ok || !HASHES[key]) return false;
  return hex(await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer())) === HASHES[key];
}

/** Datei aus dem Netz laden und nur cachen, wenn der Inhalt zum Stand passt. */
async function fetchVerified(cache, key) {
  const res = await fetch(new Request(new URL(key, self.registration.scope).href, { cache: 'reload' }));
  if (!(await matches(res, key))) throw new Error(`Integrität verletzt: ${key}`);
  await cache.put(new URL(key, self.registration.scope).href, res.clone());
  return res;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(PRECACHE.map((key) => fetchVerified(cache, key)))));
});

/** Aus dem Cache, aber nur unverändert. Sonst aus dem Netz nachladen (geprüft) oder unverändert durchreichen. */
async function serve(req, key) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(new URL(key, self.registration.scope).href);
  if (await matches(hit, key)) return hit;
  if (hit) await cache.delete(new URL(key, self.registration.scope).href);
  try {
    return await fetchVerified(cache, key);
  } catch {
    return fetch(req);
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  if (req.mode === 'navigate') {
    event.respondWith(serve(req, './index.html'));
    return;
  }
  const key = `./${url.pathname.slice(scope.pathname.length)}`;
  if (!Object.hasOwn(HASHES, key)) return; // nicht Teil der App: direkt aus dem Netz
  event.respondWith(serve(req, key));
});
