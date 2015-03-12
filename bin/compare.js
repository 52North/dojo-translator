#!/usr/bin/env node

var IO = require('../lib/io');
var Comparator = require('../lib/comparator');
var Bluebird = require('bluebird');
var cli = require('cli');
var util = require('util');

cli.enable('help', 'glob');
cli.parse({
  referenceLang: ['l', 'Reference language', 'string', ['en', 'de']]
});

cli.main(function(args, options) {
  if (!args || args.length !== 2) cli.getUsage(1);

  if (!util.isArray(options.referenceLang)) {
    options.referenceLang = options.referenceLang.split(',')
        .map(function (x) { return x.trim(); });
  }

  var io = args.map(function(arg) {
    return new IO({ source: arg, target: arg });
  });

  io.forEach(function(io) {
    io.setTargetType(io.getSourceType());
  });

  function read() {
    return Bluebird.all(io.map(function(io) { return io.read(); }));
  }

  function compare(bundleSets) {
    var c = new Comparator({
      reference: options.referenceLang
    });
    return c.run.apply(c, bundleSets);
  }

  function write(bundleSets) {
    var i, len = io.length, p = new Array(len);
    for (i = 0; i < len; ++i) {
      p[i] = io[i].write(bundleSets[i]);
    }
    return Bluebird.all(p);
  }

  read().then(compare).then(write).done();
});
