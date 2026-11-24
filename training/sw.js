// Service Worker der Trainings-PWA.
// Precache-Liste und Version werden von `npm run sw` erzeugt (scripts/update-sw.mjs). Nicht von Hand pflegen.
// Strategie: App-Dateien aus dem eigenen Cache (offline), alles andere direkt aus dem Netz, nichts zur Laufzeit cachen.
// Fremde Origins werden nicht angefasst. Neue Versionen warten, bis die App "Aktualisieren" sendet.
// Integrität: Jede Datei wird gegen ihren SHA-256 geprüft, beim Installieren und bei jeder Auslieferung aus dem Cache.
// So kann eine andere Seite derselben Origin (z. B. ein weiteres GitHub-Pages-Projekt) den Cache nicht unbemerkt verändern.

const VERSION = '354df5d4c3a4';
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
  './src/model/activities.js',
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
  './src/views/activity.js',
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
  './css/app.css': '9ebd58d5b3005586c7940f8b2434296194f26e60c62138eb287316de11f4e7d3',
  './icons/apple-touch-icon.png': '95a58253706751a489d47b83b541fbee83704061b21d7e3b865e177b44c09794',
  './icons/icon-192.png': '8065ebd975e57b644b3e911a8593dc63e3ec54bdb7e448a639c32a2e2b7c627d',
  './icons/icon-512.png': 'dab98636df3ce42fbc2d8d2b62476f8c61d4f7edd2553ce01395c8938677c536',
  './icons/icon-maskable-512.png': '95981515b9a3335f597f80d0302b4b24868f574afb9d06f68595138f6e593e6d',
  './index.html': '850102ee399c44f8cc9d2391b69fc80714973d2995756b52536b98657a911b71',
  './manifest.webmanifest': '275106e6dd0870288575a782db8624a9e562503ca1b028f9e7b8d488a13eb5bf',
  './src/agent-prompt.js': '23b94b979f10ea6bbcbbf20d23b555237598cfe0c40d3c24d0bb10dfcbf5e9cc',
  './src/app.js': '182fdf53496b2ec23f4a434796e8303a32b2c9275a3e8be8596b27786eb98b45',
  './src/dom.js': '921a23af64da7b2806ba47122b6f4f96866f4fbc0b8b7ec311c32de164eb0470',
  './src/export.js': '068f3325d6c0dfb9568597b3ee28e1ee355508923917b4b26f48c6c852939c82',
  './src/format.js': '6ac976205081b919119b2f8113969aa72da8b8a1c0e8d5f5df629c5030d1375d',
  './src/garmin/categories.js': 'dfb3e423ac9470e6416920600cb45550496d40e289473425f31ed1ad2daf32fa',
  './src/garmin/fit.js': '847268996bab34f2fec4c3c2c343cf54e61d463996dd8dff4385418fdb1699dd',
  './src/garmin/session-fit.js': '9c2785111c3ebda2d498c45904c5dcfb795aea3cb1468f81aee9d9250b9591cb',
  './src/legal.js': '3f266beabb52b32a7bccfb9ae752b7d7684ad1b532ece5f833024d3125eb80ec',
  './src/model/activities.js': '9f6d0bf212e762283736d4d1d936a2c7ae7380875c49c243823430d64f13ffea',
  './src/model/backup.js': '77fbaacf1e3db55012fd3f548d3d15b1546a8fb0472f0dd1a102e44a7433a8ef',
  './src/model/carry-over.js': 'b0dd9c883f6d0a951ba18405a3574d11be6e954b23032b4a3468dbbea11d3700',
  './src/model/coach-export.js': '5fdc1a7ff787094bf0c707a174cba1f15f9febcdf45fd19ba7b43121cefd8deb',
  './src/model/finish.js': '32a7023bd0d3689da4a02f208af2a8c8b5c6fb7d337507ede23bb43963ebbd18',
  './src/model/history.js': 'c3ccce96b6f973aa6960c23c7b9a94d28b08a54a707ad9e0656f506509d2e91c',
  './src/model/id.js': '8389633fb754df04c6d6e10acb2779a427bd3123513feedb818624afcef3a98b',
  './src/model/import.js': '3e4456cc3bfbdb6b1af5eaa11bd497d503202a2207a5371b566bd659de827cf2',
  './src/model/live.js': 'bebf2448c3760adbbd09fe69b06dc88e611a87f27ffad6edbccc684d61789e6a',
  './src/model/plan.js': 'ed8711e039c6e74cff0efe611e5340a24124e42af7dd8e1ce294a029f34c0b73',
  './src/model/progression.js': 'faf6227552207f74dc01e5b60a78514869a2327c5b1383e0090c815025412c05',
  './src/model/switch.js': 'c7cb33c34c08d06c1ff4831924cfec4049ae5dd7546fdb711e5213cea3846cce',
  './src/model/training-file.js': '80492a0372c72c36a8c22a52597bb8b59032c8a8add48b4103061c127dbb22d5',
  './src/model/validate.js': '0a309bb23adb2a2e7bd59ece2c0f50b23115d1d9cea346b7de73ea2346e67adb',
  './src/model/weeks.js': 'b20cb02aa476525bca80014673a60789ad2784d10a297e71ddf3c927b18a9e41',
  './src/sound.js': '02cf03e9826a090dae8162f57f34488d26a401a134a2e8598ba38d03867c447d',
  './src/storage.js': '09324ab3d0073229fe93b366decd95d4ddeb72dc778fafeef56cfceb034fd6de',
  './src/version.js': '83ad96130c756b3957692cc1c41205baec3f044194e3a33cc7a6ffcee88bd859',
  './src/views/activity.js': '7b1c97c56bb7c9b484ff5bd6dcdda0924dd4cb5decb6d0644bb90c728fd31e78',
  './src/views/archive.js': 'd876ff661ad18f6c5326456f5f728af5f2b8e191acf3fa83b168288c387f90da',
  './src/views/history.js': 'cd0aa220b6dc33c18825d313e9b53319c5d557d59a9f93341a06eabe6585625d',
  './src/views/info.js': '2da233d0b3e881caa8aa5557fb8cc78a9b813824ea48f2ee8dc39289874d5950',
  './src/views/live.js': '0c0e00a3a6a81a0949ba4a584093ee85bbbf3b6ea33a30946c35bc3baf2613f1',
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
