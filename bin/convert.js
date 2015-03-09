#!/usr/bin/env node
var IO = require('../lib/io');
var cli = require('cli');
cli.enable('help', 'glob');
cli.parse();
cli.main(function(args, options) {
  if (!args || args.length !== 2) cli.getUsage(1);
  new IO({ source: args[0], target: args[1] }).convert().done();
});
