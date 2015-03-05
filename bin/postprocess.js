#!/usr/bin/env node

var cli = require('cli');
var util = require('util');

var NLSReader = require('../lib/nls/reader');
var NLSWriter = require('../lib/nls/writer');
var PostProcessor = require('../lib/postprocessor');

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
  target: [ 't', 'target directory', 'path', './pp_out' ],
  bundle: [ 'b', 'Bundle name (optional)', 'string', null ],
  referenceLang: [ null, 'Reference language', 'string', 'en']
});


cli.main(function() {
  var options = this.options;
  var t, w, r;
  try {
    r = new NLSReader({ baseDir: options.baseDir, bundle: options.bundle });
    p = new PostProcessor({ referenceLang: options.referenceLang });
    w = new NLSWriter({ target: options.target });
  } catch (e) {
    console.error(e.toString().red);
    return cli.getUsage(1);
  }
  r.parse()
    .then(function(bundles) { return p.process(bundles); })
    .then(function(bundles) { return w.writeBundle(bundles); })
    .done();
});
