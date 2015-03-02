#!/usr/bin/env node

var cli = require('cli');
var NLSReader = require('../lib/nls/reader');
var NLSWriter = require('../lib/nls/writer');

cli.enable('help', 'glob');
cli.parse({
  baseDir: [ 'd', 'map.apps directory', 'path', '../_map.apps-3.1.0/ct-mapapps-js-api-3.1.0-src' ],
  target: [ 't', 'target directory', 'path', './out' ],
  bundle: [ 'b', 'Bundle name (optional)', 'string', null ]
}, [ 'read', 'translate' , 'write']);

cli.main(function() {
  var options = this.options;
  var nls;
  switch (this.command) {
    case 'read':
      if (options.baseDir) {
        nls = new NLSReader({
          baseDir: options.baseDir,
          bundle: options.bundle
        }).parse().done(function(x) {
          /*
          x.map(function(x) {
            return x.hasPlaceholders();
          });
          */
          console.log(JSON.stringify(x, null, 2));
        });
      } else {
        cli.getUsage(1);
      }
    break;
    case 'write':
      if (options.baseDir) {
        nls = new NLSReader({
          baseDir: options.baseDir,
          bundle: options.bundle
        }).parse().done(function(x) {
          var writer = new NLSWriter();
          x.forEach(function(x) {
            writer.writeBundle(options.target, x);
          });
        });
      } else {
        cli.getUsage(1);
      }
    break;
  }
});



const langs = [
'bg', 'cs', 'da', 'de',
'el', 'en', 'es', 'et',
'fi', 'fr', 'ga', 'hr',
'hu', 'it', 'lt', 'lv',
'mt', 'nl', 'pl', 'pt',
'ro', 'sk', 'sl', 'sv'
];







/*
nls.then(function(x) {
    var chars = x.map(function(x) {
      return countCharacters(x.lang.en);
    }).reduce(function(x,v) {
      return v + x;
    }, 0);
    console.log(chars + ' characters per language');
    console.log(chars * langs.length - 2 + ' for all languages');
    return x;
  });

nls.then(function(x) {
    return x.map(function(x) {
      return toArray(x.lang.en);
    }).reduce(function(prev, curr) {
      return prev.concat(curr);
    }, []);
  })
  .then(sort)
  .then(function(x) {
    console.log(x.length + ' strings');
    return x;
  })
  .then(unique)
  .then(function(x) {
    console.log(x.length + ' strings');
    console.log(x);
    return x;
  })
  .then(countStringArrayCharacters)
  .done(function(chars) {
    console.log(chars + ' characters per language');
    console.log(chars * langs.length - 2 + ' for ' + (langs.length - 2) + ' languages');

  });
*/
