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
  noop: [ 'n', 'Do not acutally execute requests' ]
});


function reader(options) {
  if (options.baseDir) {
    var r = new NLSReader({
      baseDir: options.baseDir,
      bundle: options.bundle
    });
    return function() { return r.parse(); };
  } else {
    return cli.getUsage(1);
  }
}

function writer(options) {
  return function(bundles) {
    var writer = new NLSWriter();
    bundles.forEach(function(bundle) {
      writer.writeBundle(options.target, bundle);
    });
    return bundles;
  };
}

function translator(options) {
  var t = new Translator({
    key: options.apikey,
    sourceLang: options.sourceLang,
    noop: options.noop
  });
  if (!options.targetLang) cli.getUsage(1);
  if (!util.isArray(options.targetLang)) {
    options.targetLang = [options.targetLang];
  }
  return function(bundles) {
    return Promise.all(bundles.map(function(bundle) {
      return Promise.all(options.targetLang.map(function(targetLang) {
        return t.translate(bundle, targetLang);
      }));
    })).then(function() { return bundles; });
  };
}

cli.main(function() {
  var options = this.options;
  if (!util.isArray(options.targetLang)) {
    options.targetLang = options.targetLang.split(",")
        .map(function(x) { return x.trim(); });
  }
  var t, w, r;
  try {
    t = translator(options);
    w = writer(options);
    r = reader(options);
  } catch (e) {
    console.error(e.toString().red);
    return cli.getUsage(1);
  }
  r().then(t).done(w);
});