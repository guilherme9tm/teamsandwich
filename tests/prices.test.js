const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function service() {
  const context = vm.createContext({ module: { exports: {} }, AbortController, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync('js/prices.js', 'utf8'), context);
  return context.module.exports;
}
const observation = { d: new Date().toISOString().slice(0, 10), FXUSDCAD: { v: '1.40' }, FXEURCAD: { v: '1.50' } };

test('CAD estimates convert source currencies, preserve records, zeros and digital units', async () => {
  const prices = service();
  await prices.loadRates(async () => Response.json({ observations: [observation] }));
  const source = { value: 10, currency: 'USD', variant: 'foil', printingId: 'one' };
  assert.equal(prices.toCAD(source).value, 14);
  assert.equal(source.value, 10); assert.equal(source.currency, 'USD');
  assert.match(prices.format(source), /CAD.*14\.00/);
  assert.equal(prices.toCAD({ value: 10, currency: 'EUR' }).value, 15);
  assert.equal(prices.toCAD({ value: 3, currency: 'CAD' }).value, 3);
  assert.match(prices.format({ value: 0, currency: 'USD' }), /CAD.*0\.00/);
  assert.equal(prices.format({ value: 2, currency: 'TIX' }), '2.00 TIX');
  assert.equal(prices.format(null), null);
});

test('missing, malformed and stale exchange rates never relabel USD amounts as CAD', async () => {
  for (const result of [null, { ...observation, FXUSDCAD: { v: '0' } }, { ...observation, d: '2000-01-01' }]) {
    const prices = service();
    await prices.loadRates(async () => result ? Response.json({ observations: [result] }) : new Response('', { status: 503 }));
    assert.equal(prices.format({ value: 10, currency: 'USD' }), null);
    assert.equal(prices.rateDate, null);
    assert.match(prices.format({ value: 10, currency: 'CAD' }), /CAD.*10\.00/);
  }
});

test('concurrent currency requests share a download and retain valid rates on a failed refresh', async () => {
  const prices = service(); let calls = 0;
  const download = async () => { calls++; return Response.json({ observations: [observation] }); };
  await Promise.all([prices.loadRates(download), prices.loadRates(download)]);
  assert.equal(calls, 1);
  await prices.loadRates(async () => { throw new Error('offline'); });
  assert.equal(prices.toCAD({ value: 10, currency: 'USD' }).value, 14);
});
