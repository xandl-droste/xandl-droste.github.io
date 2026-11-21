// Kleiner FIT-Binär-Encoder (nur Schreiben). Keine Abhängigkeiten.
// Aufbau: 14-Byte-Header, Definition- und Data-Messages, CRC am Ende.
// Referenz: FIT-Protokoll 2.0 (Little Endian), Profil-Nummern aus dem FIT-Profil.

export const PROTOCOL_VERSION = 0x20; // 2.0
export const PROFILE_VERSION = 2132; // 21.32: Profilversion im Dateikopf. Die Kategorie-Nummern stammen aus dem neueren SDK 21.221 (abwärtskompatibel).

/** Sekunden zwischen 1970-01-01 und dem FIT-Epoch 1989-12-31T00:00:00Z. */
export const FIT_EPOCH_OFFSET = 631065600;

// Basistypen: [Kennung, Bytes, Ungültig-Wert]
export const BASE = {
  enum: [0x00, 1, 0xff],
  uint8: [0x02, 1, 0xff],
  uint16: [0x84, 2, 0xffff],
  uint32: [0x86, 4, 0xffffffff],
  uint32z: [0x8c, 4, 0],
};

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

/** FIT-CRC-16 (entspricht CRC-16/ARC). */
export function crc16(bytes, crc = 0) {
  for (const byte of bytes) {
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[byte & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc;
}

/** Date oder ISO-String → FIT-Zeitstempel (uint32, Sekunden seit FIT-Epoch). */
export function fitTime(d) {
  const ms = d instanceof Date ? d.getTime() : Date.parse(d);
  if (!Number.isFinite(ms)) throw new RangeError('fitTime: ungültiges Datum');
  const t = Math.floor(ms / 1000) - FIT_EPOCH_OFFSET;
  if (t < 0 || t >= 0xffffffff) throw new RangeError('fitTime: außerhalb des FIT-Bereichs');
  return t;
}

/** 14-Byte-Dateiheader inkl. Header-CRC. */
export function fileHeader(dataSize) {
  if (!Number.isInteger(dataSize) || dataSize < 0 || dataSize > 0xffffffff) throw new RangeError('fileHeader: dataSize');
  const h = new Uint8Array(14);
  const v = new DataView(h.buffer);
  h[0] = 14;
  h[1] = PROTOCOL_VERSION;
  v.setUint16(2, PROFILE_VERSION, true);
  v.setUint32(4, dataSize, true);
  h.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
  v.setUint16(12, crc16(h.subarray(0, 12)), true);
  return h;
}

function writeValue(view, offset, [, size, invalid], value) {
  const v = value ?? invalid;
  if (!Number.isInteger(v) || v < 0 || v > 2 ** (8 * size) - 1) throw new RangeError(`FIT-Wert außerhalb des Bereichs: ${value}`);
  if (size === 1) view.setUint8(offset, v);
  else if (size === 2) view.setUint16(offset, v, true);
  else view.setUint32(offset, v, true);
}

/**
 * Baut eine FIT-Datei.
 * messages: [{ global, fields: [[fieldNum, baseTypeName, value], …] }, …]
 * Gleiche Nachrichten-Layouts teilen sich einen lokalen Typ (höchstens 16 verschiedene).
 */
export function encodeFit(messages) {
  const chunks = [];
  const layouts = new Map();
  for (const msg of messages) {
    const key = `${msg.global}|${msg.fields.map(([n, t]) => `${n}:${t}`).join(',')}`;
    let local = layouts.get(key);
    if (local === undefined) {
      local = layouts.size;
      if (local > 15) throw new RangeError('encodeFit: zu viele Nachrichten-Layouts');
      layouts.set(key, local);
      const def = new Uint8Array(6 + msg.fields.length * 3);
      const dv = new DataView(def.buffer);
      def[0] = 0x40 | local;
      def[1] = 0; // reserviert
      def[2] = 0; // Little Endian
      dv.setUint16(3, msg.global, true);
      def[5] = msg.fields.length;
      msg.fields.forEach(([num, type], i) => {
        const base = BASE[type];
        if (!base) throw new TypeError(`encodeFit: unbekannter Typ ${type}`);
        def.set([num, base[1], base[0]], 6 + i * 3);
      });
      chunks.push(def);
    }
    const size = msg.fields.reduce((n, [, type]) => n + BASE[type][1], 0);
    const data = new Uint8Array(1 + size);
    const dv = new DataView(data.buffer);
    data[0] = local;
    let off = 1;
    for (const [, type, value] of msg.fields) {
      writeValue(dv, off, BASE[type], value);
      off += BASE[type][1];
    }
    chunks.push(data);
  }
  const dataSize = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(14 + dataSize + 2);
  out.set(fileHeader(dataSize), 0);
  let off = 14;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  new DataView(out.buffer).setUint16(off, crc16(out.subarray(0, off)), true);
  return out;
}

// Globale Nachrichtennummern und Enum-Werte aus dem FIT-Profil (nur was gebraucht wird).
export const MSG = { fileId: 0, session: 18, lap: 19, event: 21, activity: 34, set: 225 };
export const SPORT = { training: 10 };
export const SUB_SPORT = { strengthTraining: 20 };
export const SET_TYPE = { rest: 0, active: 1 };

/**
 * Krafttraining als FIT-Aktivität.
 * sets: [{ start: Date, durationSec, type: 'active'|'rest', reps?, kg?, category?, subcategory? }]
 */
export function strengthActivity({ start, end, sets, serial = 1 }) {
  const t0 = fitTime(start);
  const t1 = fitTime(end);
  const elapsed = (t1 - t0) * 1000;
  const active = sets.filter((s) => s.type === 'active');
  const msgs = [
    {
      global: MSG.fileId,
      fields: [
        [0, 'enum', 4], // type = activity
        [1, 'uint16', 255], // manufacturer = development
        [2, 'uint16', 0], // product
        [3, 'uint32z', serial], // serial_number
        [4, 'uint32', t0], // time_created
      ],
    },
    { global: MSG.event, fields: [[253, 'uint32', t0], [0, 'enum', 0], [1, 'enum', 0]] }, // timer start
  ];
  sets.forEach((s, i) => {
    const st = fitTime(s.start);
    const isActive = s.type === 'active';
    msgs.push({
      global: MSG.set,
      fields: [
        [254, 'uint32', st + Math.round(s.durationSec)], // timestamp (Ende des Satzes)
        [0, 'uint32', Math.round(s.durationSec * 1000)], // duration, ms
        [3, 'uint16', isActive ? (s.reps ?? null) : null], // repetitions
        [4, 'uint16', isActive && s.kg != null ? Math.round(s.kg * 16) : null], // weight, kg × 16
        [5, 'uint8', isActive ? SET_TYPE.active : SET_TYPE.rest], // set_type
        [6, 'uint32', st], // start_time
        [7, 'uint16', isActive ? (s.category ?? 65534) : null], // category (65534 = unknown)
        [8, 'uint16', isActive ? (s.subcategory ?? null) : null], // category_subtype
        [9, 'uint16', 1], // weight_display_unit = kilogram
        [10, 'uint16', i], // message_index
      ],
    });
  });
  const totals = [
    [253, 'uint32', t1],
    [2, 'uint32', t0], // start_time
    [7, 'uint32', elapsed], // total_elapsed_time
    [8, 'uint32', elapsed], // total_timer_time
  ];
  msgs.push({ global: MSG.event, fields: [[253, 'uint32', t1], [0, 'enum', 0], [1, 'enum', 4]] }); // timer stop_all
  msgs.push({
    global: MSG.lap,
    fields: [...totals, [0, 'enum', 9], [1, 'enum', 1], [25, 'enum', SPORT.training], [39, 'enum', SUB_SPORT.strengthTraining]],
  });
  msgs.push({
    global: MSG.session,
    fields: [
      ...totals,
      [0, 'enum', 8], // event = session
      [1, 'enum', 1], // event_type = stop
      [5, 'enum', SPORT.training],
      [6, 'enum', SUB_SPORT.strengthTraining],
      [10, 'uint32', active.reduce((n, s) => n + (s.reps ?? 0), 0)], // total_cycles = Wiederholungen
      [25, 'uint16', 0], // first_lap_index
      [26, 'uint16', 1], // num_laps
    ],
  });
  msgs.push({
    global: MSG.activity,
    fields: [
      [253, 'uint32', t1],
      [0, 'uint32', elapsed], // total_timer_time
      [1, 'uint16', 1], // num_sessions
      [2, 'enum', 0], // type = manual
      [3, 'enum', 26], // event = activity
      [4, 'enum', 1], // event_type = stop
    ],
  });
  return encodeFit(msgs);
}
