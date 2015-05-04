#!/usr/bin/env node

var IO = require('../lib/io');
var NLSWriter = require('../lib/nls/writer');
var cli = require('cli');
cli.enable('help', 'glob');
cli.parse();

cli.main(function(args, options) {
  if (!args || args.length !== 3) cli.getUsage(1);
  new IO({ source: args[0] })
  	.read()
  	.then(function(x) {
  		var writer = new NLSWriter({ target: args[1] });
  		return writer.writeI18NExtensionBundle(x, args[2]);
  	})
  	.done();
});
