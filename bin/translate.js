#!/usr/bin/env node

var cli = require('cli');
var util = require('util');
var fs = require('fs');
var Translator = require('../lib/translator');
var IO = require('../lib/io');

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
  bundle: ['b', 'Bundle name (optional)', 'string', null],
  targetLang: ['l', 'Target language', 'string', langs.filter(function(x) {
    return x !== 'en' && x !== 'de';
  })],
  sourceLang: [null, 'Source language', 'string', 'en'],
  apikey: ['k', 'Google Cloud Platform API key', 'string', null],
  noop: ['n', 'Do not acutally execute requests'],
  concurrency: ['c', 'Concurrency level', 'int', 20]
});


cli.main(function(args, options) {
  if (!options.targetLang) cli.getUsage(1);
  if (!util.isArray(options.targetLang)) {
    options.targetLang = options.targetLang.split(",")
      .map(function(x) {
        return x.trim();
      });
  }

  if (!args || args.length !== 2) cli.getUsage(1);
  var source = args[0];
  var target = args[1];

  var t, io;
  try {
    io = new IO({
      source: source,
      target: target,
      bundle: options.bundle
    });

    io.setTargetType(io.getSourceType());

    t = new Translator({
      key: options.apikey,
      sourceLang: options.sourceLang,
      noop: options.noop,
      concurrency: options.concurrency
    });
  } catch (e) {
    console.error(e.toString().red);
    return cli.getUsage(1);
  }
  io.read()
    .then(function(bundles) {
      return t.translate(bundles, options.targetLang);
    })
    .then(function(bundles) {
      return io.write(bundles);
    })
    .done();
});
