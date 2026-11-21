// Zufällige IDs (UUID v4).
// crypto.randomUUID() gibt es nur in sicheren Kontexten (https, localhost). Wird die App z. B. im WLAN über
// http://<IP> geöffnet, fehlt es. crypto.getRandomValues() ist überall verfügbar.

export function newId(c = globalThis.crypto) {
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // Version 4
  b[8] = (b[8] & 0x3f) | 0x80; // Variante RFC 4122
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
