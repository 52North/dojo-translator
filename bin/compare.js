#!/usr/bin/env node

var IO = require('../lib/io');
var Comparator = require('../lib/comparator');
var Bluebird = require('bluebird');
var cli = require('cli');

cli.enable('help', 'glob');
cli.parse();

cli.main(function(args, options) {
  if (!args || args.length !== 2) cli.getUsage(1);

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
    var c = new Comparator();
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
