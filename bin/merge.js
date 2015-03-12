#!/usr/bin/env node

var IO = require('../lib/io');
var Comparator = require('../lib/comparator');
var Bluebird = require('bluebird');
var cli = require('cli');
var util = require('util');
var Bundle = require('../lib/bundle');
var LocalizedString = require('../lib/localizedstring');

cli.enable('help', 'glob');
cli.parse();

function Merger() {
  this.bundles = {};
}

Merger.prototype.addTranslation = function(bundleId, stringId, lang, translation) {
  var translations = this.bundles[bundleId].strings[stringId].translations;

  if (translations[lang] === undefined) {
    translations[lang] = translation;
  } else if (util.isArray(translations[lang])) {
    if (translations[lang].indexOf(translation) < 0) {
      translations[lang].push(translation);
    }
  } else if (translations[lang] !== translation) {
    translations[lang] = [translations[lang], translation];
  }

  return this;
};

Merger.prototype.addString = function(bundleId, string) {
  var bundle = this.bundles[bundleId];
  var id = string.getId();
  var self = this;
  bundle.strings[id] = bundle.strings[id] || new LocalizedString({id: id});
  string.getLanguages().forEach(function(lang) {
    self.addTranslation(bundleId, id, lang, string.getTranslation(lang));
  });
  return this;
};

Merger.prototype.addBundle = function(bundle) {
  var id = bundle.getId();
  var self = this;
  this.bundles[id] =  this.bundles[id] || new Bundle({ id: id, strings: {} });
  bundle.getIds().forEach(function(key) {
    self.addString(id, bundle.getString(key));
  });
  return this;
};

Merger.prototype.addBundleSet = function(set) {
  for (var key in set) {
    this.addBundle(set[key]);
  }
  return this;
};
Merger.prototype.addBundleSets = function(sets) {
  var self = this;

  sets.forEach(function(set) {
    self.addBundleSet(set);
  });
  return this;
};

Merger.prototype.get = function() {
  var self = this;
  return Object.keys(this.bundles).map(function(key) { return self.bundles[key]; });
};


cli.main(function(args, options) {
  if (!args || args.length < 3) cli.getUsage(1);

  var input = args.slice(0, -1).map(function(arg) {
    return new IO({ source: arg });
  });

  var output = new IO({ target: args[args.length - 1] });
  output.setTargetType('file');


  function read() {
    return Bluebird.all(input.map(function(input) { return input.read(); }));
  }

  function merge(sets) {
    return Promise.resolve(new Merger().addBundleSets(sets).get());
  }

  function write(bundles) {
    return output.write(bundles);
  }

  read().then(merge).then(write).done();
});
