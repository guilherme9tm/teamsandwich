const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function localization(saved) {
  const values = new Map(saved ? [['lang', saved]] : []); const events = [];
  const context = vm.createContext({ AppStorage: { local: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } },
    document: { querySelectorAll: () => [], querySelector: () => null, documentElement: {} },
    window: { dispatchEvent: event => events.push(event) }, CustomEvent: class { constructor(name, options) { this.type = name; this.detail = options.detail; } } });
  vm.runInContext(fs.readFileSync('js/i18n.js', 'utf8') + '\n' + fs.readFileSync('js/locales.js', 'utf8') + '\nglobalThis.locale = I18N;', context);
  return { locale: context.locale, values, events };
}
test('English is the default, five languages persist and missing keys fall back to English', () => {
  const { locale, values, events } = localization(); assert.equal(locale.current, 'en');
  for (const lang of ['pt', 'es', 'fr', 'de', 'en']) { locale.setLang(lang); assert.equal(values.get('lang'), lang); }
  locale.dict.en.onlyEnglish = 'Fallback'; locale.setLang('pt'); assert.equal(locale.t('onlyEnglish'), 'Fallback');
  assert.equal(events.at(-1).detail.lang, 'pt'); assert.equal(localization('es').locale.current, 'es');
});
test('all English interface keys have translations in every supported language', () => {
  const { locale } = localization();
  for (const lang of ['pt', 'es', 'fr', 'de']) assert.deepEqual(Object.keys(locale.dict.en).filter(key => !locale.dict[lang][key]), [], lang);
});
test('land cycles use explicit full card identities and never substring matching', () => {
  const context = vm.createContext({ module: { exports: {} } }); vm.runInContext(fs.readFileSync('js/lands.js', 'utf8'), context);
  const lands = context.module.exports;
  assert.equal(Object.keys(lands.cycles).length, 14); assert.equal(lands.includes('fetch', 'Misty Rainforest'), true);
  assert.equal(lands.includes('fetch', 'Rainforest'), false); assert.equal(lands.includes('pathway', 'Brightclimb Pathway // Grimclimb Pathway'), true);
  for (const cycle of Object.values(lands.cycles)) assert.equal(new Set(cycle.cards).size, cycle.cards.length);
});
