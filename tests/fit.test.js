import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, fileHeader, encodeFit, fitTime, PROFILE_VERSION } from '../training/src/garmin/fit.js';

const u16 = (b, o) => b[o] | (b[o + 1] << 8);

test('CRC-16 entspricht CRC-16/ARC (Prüfwert 123456789)', () => {
  assert.equal(crc16(new TextEncoder().encode('123456789')), 0xbb3d);
  assert.equal(crc16(new Uint8Array(0)), 0);
});

test('Header: Größe, Version, Datengröße, .FIT, Header-CRC', () => {
  const h = fileHeader(1234);
  assert.equal(h.length, 14);
  assert.equal(h[0], 14);
  assert.equal(h[1], 0x20);
  assert.equal(u16(h, 2), PROFILE_VERSION);
  assert.equal(new DataView(h.buffer).getUint32(4, true), 1234);
  assert.equal(String.fromCharCode(...h.subarray(8, 12)), '.FIT');
  assert.equal(u16(h, 12), crc16(h.subarray(0, 12)));
  assert.throws(() => fileHeader(-1), RangeError);
});

test('Datei: CRC über die ganze Datei ergibt 0, Datengröße stimmt', () => {
  const f = encodeFit([{ global: 0, fields: [[0, 'enum', 4], [4, 'uint32', 1000]] }]);
  assert.equal(crc16(f), 0);
  assert.equal(new DataView(f.buffer).getUint32(4, true), f.length - 16);
  assert.equal(f[14], 0x40); // Definition, lokaler Typ 0
  assert.equal(f[14 + 6 + 2 * 3], 0x00); // Data-Message, lokaler Typ 0
});

test('Werte außerhalb des Bereichs werden abgelehnt', () => {
  assert.throws(() => encodeFit([{ global: 0, fields: [[0, 'uint8', 256]] }]), RangeError);
  assert.throws(() => encodeFit([{ global: 0, fields: [[0, 'uint16', -1]] }]), RangeError);
  assert.throws(() => encodeFit([{ global: 0, fields: [[0, 'uint16', 1.5]] }]), RangeError);
  assert.throws(() => fitTime('kein Datum'), RangeError);
  assert.throws(() => fitTime('1980-01-01T00:00:00Z'), RangeError);
});

test('fitTime rechnet ab dem FIT-Epoch', () => {
  assert.equal(fitTime('1989-12-31T00:00:00Z'), 0);
  assert.equal(fitTime(new Date('1989-12-31T00:01:00Z')), 60);
});

