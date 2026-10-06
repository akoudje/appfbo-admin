import test from 'node:test';
import assert from 'node:assert/strict';
import { parcelLabelHtml, parcelFormatLayout } from './src/utils/parcelLabel.js';

test('parcel labels escape customer fields and omit secrets and internal details', () => {
 const html = parcelLabelHtml({ id: 'order', deliveryMode: 'RETRAIT_SITE_FLP', fboNomComplet: '<img src=x onerror=alert(1)>', fboNumero: '225-000-111-222', parcelNumber: 'COLIS-1', pickupPointLabel: '" onfocus=alert(1)', pickupSecretCode: 'SECRET-1234', internalNote: 'PRIVATE-NOTE', totalFcfa: 999999 }, '<svg></svg>');
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot; onfocus'));assert.ok(!html.includes('SECRET-1234'));assert.ok(!html.includes('PRIVATE-NOTE'));assert.ok(!html.includes('999999'));assert.ok(html.includes('COLIS-1'));assert.ok(html.includes('@page{size:100mm 150mm'));
});

test('thermal landscape keeps roll width while rotating content within the paper', () => {
 for (const [format, width, height] of [['thermal58',58,90],['thermal80',80,100]]) {
  const portrait = parcelFormatLayout(format, 'portrait');
  const landscape = parcelFormatLayout(format, 'landscape');
  assert.equal(landscape.width, portrait.width);assert.equal(landscape.height, portrait.height);
  assert.ok(landscape.css.includes('@page{size:' + width + 'mm ' + height + 'mm'));
  assert.ok(landscape.css.includes('width:' + height + 'mm;height:' + width + 'mm'));
  assert.ok(landscape.css.includes('translateX(' + width + 'mm) rotate(90deg)'));
  assert.ok(portrait.css.includes('transform:none'));
  assert.ok(landscape.css.includes('.qr{width:20mm;height:20mm}'));
 }
 assert.throws(() => parcelFormatLayout('unknown'));
 assert.throws(() => parcelFormatLayout('thermal58','invalid'));
});
