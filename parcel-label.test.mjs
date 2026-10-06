import test from 'node:test';
import assert from 'node:assert/strict';
import { parcelLabelHtml } from './src/utils/parcelLabel.js';

test('parcel labels escape customer fields and omit secrets and internal details', () => {
 const html = parcelLabelHtml({ id: 'order', deliveryMode: 'RETRAIT_SITE_FLP', fboNomComplet: '<img src=x onerror=alert(1)>', fboNumero: '225-000-111-222', parcelNumber: 'COLIS-1', pickupPointLabel: '" onfocus=alert(1)', pickupSecretCode: 'SECRET-1234', internalNote: 'PRIVATE-NOTE', totalFcfa: 999999 }, '<svg></svg>');
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot; onfocus'));assert.ok(!html.includes('SECRET-1234'));assert.ok(!html.includes('PRIVATE-NOTE'));assert.ok(!html.includes('999999'));assert.ok(html.includes('COLIS-1'));assert.ok(html.includes('@page{size:100mm 150mm'));
});
