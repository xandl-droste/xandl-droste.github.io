// Service Worker der Trainings-PWA.
// Precache-Liste und Version werden von `npm run sw` erzeugt (scripts/update-sw.mjs). Nicht von Hand pflegen.
// Strategie: App-Dateien aus dem eigenen Cache (offline), alles andere direkt aus dem Netz, nichts zur Laufzeit cachen.
// Fremde Origins werden nicht angefasst. Neue Versionen warten, bis die App "Aktualisieren" sendet.
// Integrität: Jede Datei wird gegen ihren SHA-256 geprüft, beim Installieren und bei jeder Auslieferung aus dem Cache.
// So kann eine andere Seite derselben Origin (z. B. ein weiteres GitHub-Pages-Projekt) den Cache nicht unbemerkt verändern.

const VERSION = 'd0beccbce47c';
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
  './src/model/carry-over.js',
  './src/model/coach-export.js',
  './src/model/finish.js',
  './src/model/history.js',
  './src/model/id.js',
  './src/model/import.js',
  './src/model/live.js',
  './src/model/plan.js',
  './src/model/progression.js',
  './src/model/switch.js',
  './src/model/training-file.js',
  './src/model/validate.js',
  './src/model/weeks.js',
  './src/sound.js',
  './src/storage.js',
  './src/version.js',
  './src/views/archive.js',
  './src/views/history.js',
  './src/views/info.js',
  './src/views/live.js',
  './src/views/plan.js',
  './src/views/rpe.js',
  './src/wakelock.js',
];
const HASHES = {
  './': '850102ee399c44f8cc9d2391b69fc80714973d2995756b52536b98657a911b71',
  './css/app.css': '73a0d973cf84154f6a5f60c7cf1f15d80753a240f129481958fc6bff37acb103',
  './icons/apple-touch-icon.png': '95a58253706751a489d47b83b541fbee83704061b21d7e3b865e177b44c09794',
  './icons/icon-192.png': '8065ebd975e57b644b3e911a8593dc63e3ec54bdb7e448a639c32a2e2b7c627d',
  './icons/icon-512.png': 'dab98636df3ce42fbc2d8d2b62476f8c61d4f7edd2553ce01395c8938677c536',
  './icons/icon-maskable-512.png': '95981515b9a3335f597f80d0302b4b24868f574afb9d06f68595138f6e593e6d',
  './index.html': '850102ee399c44f8cc9d2391b69fc80714973d2995756b52536b98657a911b71',
  './manifest.webmanifest': '275106e6dd0870288575a782db8624a9e562503ca1b028f9e7b8d488a13eb5bf',
  './src/agent-prompt.js': 'fc19174b153c572088f7345cb8e0b781052dcdf5fe9b6f25fe7e6754671665ef',
  './src/app.js': '9dbc65b68b079fd99e8c6012f47bf267186414856e7fa78ae7a10318cc97d201',
  './src/dom.js': '921a23af64da7b2806ba47122b6f4f96866f4fbc0b8b7ec311c32de164eb0470',
  './src/export.js': '068f3325d6c0dfb9568597b3ee28e1ee355508923917b4b26f48c6c852939c82',
  './src/format.js': 'fd031afc034fa9cba9ed95fc584c35d82ae04df0bf129347bdce38d1e9e95ad1',
  './src/garmin/categories.js': 'dfb3e423ac9470e6416920600cb45550496d40e289473425f31ed1ad2daf32fa',
  './src/garmin/fit.js': '847268996bab34f2fec4c3c2c343cf54e61d463996dd8dff4385418fdb1699dd',
  './src/garmin/session-fit.js': '9c2785111c3ebda2d498c45904c5dcfb795aea3cb1468f81aee9d9250b9591cb',
  './src/legal.js': '3f266beabb52b32a7bccfb9ae752b7d7684ad1b532ece5f833024d3125eb80ec',
  './src/model/backup.js': '404c698733283398b7578418510208abdefeab4f23c7ec59704c8758591f31e0',
  './src/model/carry-over.js': 'b0dd9c883f6d0a951ba18405a3574d11be6e954b23032b4a3468dbbea11d3700',
  './src/model/coach-export.js': '2e2834b26ac3aa73c8fcd6a24c66cedb8f6956a00756139d580898021bd60eb3',
  './src/model/finish.js': '32a7023bd0d3689da4a02f208af2a8c8b5c6fb7d337507ede23bb43963ebbd18',
  './src/model/history.js': '051f79a27895cf3f0299703db8179a188bcacec47b348bc4d0967ba00d678d70',
  './src/model/id.js': '8389633fb754df04c6d6e10acb2779a427bd3123513feedb818624afcef3a98b',
  './src/model/import.js': '7de04fd4569a440459cbe279d49d1591c7fcb53a5980b51e543827c63b44736a',
  './src/model/live.js': '16fece6f1479b02b0fcba3b3e91d570df253a6af38c8b8ab30a73a988ab6cd1a',
  './src/model/plan.js': '21e4139da0cab77b14b9a2e1c2f4327ec0b7fd2752f5bfa5e7f1b0e32260b99c',
  './src/model/progression.js': 'faf6227552207f74dc01e5b60a78514869a2327c5b1383e0090c815025412c05',
  './src/model/switch.js': 'c7cb33c34c08d06c1ff4831924cfec4049ae5dd7546fdb711e5213cea3846cce',
  './src/model/training-file.js': '838a1a013cc3511ff53289c61473354857831b722bbff6c2dc2982ec160c5459',
  './src/model/validate.js': 'a3d5c5a603f06fd89c2c2b8d5a950c3887f4ba0314883adf66a9d8b54fb847b8',
  './src/model/weeks.js': 'd05245a09b68fecd4bc81b07da718bcb156c0be54f295f41dbe26006b54e7520',
  './src/sound.js': '02cf03e9826a090dae8162f57f34488d26a401a134a2e8598ba38d03867c447d',
  './src/storage.js': 'ac896a27e67e4e48f98720cfb4920b44b83a0601466c0feb746aca20eab14a24',
  './src/version.js': '8171336bd239a1d0e0cac556dd9e49fdcc13a95a4d7e4cddab0429f904ff9dd5',
  './src/views/archive.js': 'd14baba7c192daa548e96a104eafa9ab9a7a9e78524e5c1740109637dab4bb97',
  './src/views/history.js': '2ee42488b5ec095de8759ecf001ed7c7f5f4ebe3d2173d44f3190683aabf88ea',
  './src/views/info.js': '93376de64bf4622330a76d0cd9e1116f29a97b32115492136dd2a278b00e6ebe',
  './src/views/live.js': '652abd2cbfc0711659834887cc70657c734d15c9ee16a147a9cf8009a00a0e5f',
  './src/views/plan.js': '17cc3bfb2021908bbb3954c5fe351fcf33adab737a1eaf4f53315bbe103f0b6d',
  './src/views/rpe.js': 'e20cd3e2f2eeeee7db45dc21c5a5472f04593b427804da6bfd4bc80ca7c308aa',
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
