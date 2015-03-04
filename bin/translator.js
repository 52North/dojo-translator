#!/usr/bin/env node

var cli = require('cli');
var NLSReader = require('../lib/nls/reader');
var NLSWriter = require('../lib/nls/writer');
var Translator = require('../lib/translator');
var util = require('util');



var langs = [
  'bg', 'cs', 'da', 'de',
  'el', 'en', 'es', 'et',
  'fi', 'fr', 'ga', 'hr',
  'hu', 'it', 'lt', 'lv',
  'mt', 'nl', 'pl', 'pt',
  'ro', 'sk', 'sl', 'sv'
];

cli.enable('help', 'glob');
cli.parse({
  baseDir: [ 'd', 'map.apps directory', 'path', '../_map.apps-3.1.0/ct-mapapps-js-api-3.1.0-src' ],
  target: [ 't', 'target directory', 'path', './out' ],
  bundle: [ 'b', 'Bundle name (optional)', 'string', null ],
  targetLang: [ 'l', 'Target language', 'string', langs.filter(function(x) { return x !== 'en' && x !==  'de'; }) ],
  sourceLang: [ null, 'Source language', 'string', 'en'],
  apikey: [ 'k', 'Google Cloud Platform API key', 'string', null ],
  noop: [ 'n', 'Do not acutally execute requests' ],
  concurrency: [ 'c', 'Concurrency level', 'int', 20 ]
});


cli.main(function() {
  var options = this.options;
  if (!options.targetLang) cli.getUsage(1);
  if (!util.isArray(options.targetLang)) {
    options.targetLang = options.targetLang.split(",")
        .map(function(x) { return x.trim(); });
  }

  var t, w, r;
  try {
    r = new NLSReader({
      baseDir: options.baseDir,
      bundle: options.bundle
    });
    t = new Translator({
      key: options.apikey,
      sourceLang: options.sourceLang,
      noop: options.noop,
      concurrency: options.concurrency
    });
    w = new NLSWriter({
      target: options.target
    });
  } catch (e) {
    console.error(e.toString().red);
    return cli.getUsage(1);
  }
  r.parse()
    .then(function(bundles) {
      options.targetLang.forEach(function(lang) {
        bundles.forEach(function(bundle) {
          t.translate(bundle, lang);
        });
      });
      return bundles;
    }).then(function(bundles) {
      w.writeBundle(bundles);
    }).done();
});
