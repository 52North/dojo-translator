#!/usr/bin/env node

var cli = require('cli');
var util = require('util');
var io = require('../lib/io');
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
  bundle: ['b', 'Bundle name (optional)', 'string', null],
  referenceLang: ['l', 'Reference language', 'string', 'en'],
  interactive: ['i', 'Interactivly edit translations']
});


cli.main(function(args, options) {
  var t, io;
  if (!args || args.length !== 2) cli.getUsage(1);
  var source = args[0];
  var target = args[1];
  try {
    io = new IO({
      source: source,
      target: target,
      bundle: options.bundle
    });
    io.setTargetType(io.getTargetType());
    p = new PostProcessor({
      referenceLang: options.referenceLang,
      interactive: options.interactive
    });
  } catch (e) {
    console.error(e.toString().red);
    return cli.getUsage(1);
  }
  io.read()
    .then(function(bundles) {
      return p.process(bundles);
    })
    .then(function(bundles) {
      return io.write(bundles);
    })
    .done();
});
