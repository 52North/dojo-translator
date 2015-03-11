var NLSReader = require('./nls/reader');
var NLSWriter = require('./nls/writer');
var Bluebird = require('bluebird');
var Bundle = require('./bundle');
var LocalizedString = require('./localizedstring');
var fs = Bluebird.promisifyAll(require('fs'));

function IO(options) {
  this.source = options.source;
  this.target = options.target;
  this.bundle = options.bundle;
  var stats = fs.statSync(this.source);
  if (stats.isDirectory()) {
    this.sourceType = 'directory';
  } else if (stats.isFile()) {
    this.sourceType = 'file';
  } else {
    throw new Error(source + ' is neither a file nor a directory');
  }

  if (options.targetType) {
    this.targetType = options.targetType;
  } else {
    switch (this.sourceType) {
      case 'file':
        this.targetType = 'directory';
        break;
      case 'directory':
        this.targetType = 'file';
        break;
    }
  }
}

IO.prototype.getSourceType = function() {
  return this.sourceType;
};

IO.prototype.getTargetType = function() {
  return this.targetType;
};

IO.prototype.setSourceType = function(type) {
  this.sourceType = type;
};

IO.prototype.setTargetType = function(type) {
  this.targetType = type;
};

IO.prototype.read = function() {
  console.log("reading", this.sourceType);
  switch (this.sourceType) {
    case 'file':
      return this.readSingleFile(this.source);
    case 'directory':
      return new NLSReader({
        baseDir: this.source,
        bundle: this.bundle
      }).parse();
  }
};

IO.prototype.write = function(bundles) {
  console.log("writing", this.targetType);
  switch (this.targetType) {
    case 'file':
      return this.writeSingleFile(bundles, this.target);
    case 'directory':
      return new NLSWriter({
        target: this.target
      }).writeBundle(bundles);
  }
};

IO.prototype.readSingleFile = function(file) {
  var self = this;
  return fs.readFileAsync(file, 'utf8').then(function(file) {
    var json = JSON.parse(file);
    var bundleName, stringName, bundles = [],
      strings, langName;
    for (bundleName in json) {
      if (self.bundle && bundleName !== self.bundle) continue;
      strings = {};
      for (stringName in json[bundleName]) {

        strings[stringName] = new LocalizedString({
          id: stringName,
          translations: json[bundleName][stringName]
        });
      }
      bundles.push(new Bundle({
        id: bundleName,
        strings: strings
      }));
    }
    return bundles;
  });
};

IO.prototype.writeSingleFile = function(bundles, file) {
  var i, j, k, stringIds, langs, json = {};
  for (i = 0; i < bundles.length; ++i) {
    json[bundles[i].getId()] = {};
    stringIds = bundles[i].getIds();
    for (j = 0; j < stringIds.length; ++j) {
      json[bundles[i].getId()][stringIds[j]] = {};
      langs = bundles[i].getString(stringIds[j]).getLanguages();
      for (k = 0; k < langs.length; ++k) {
        json[bundles[i].getId()][stringIds[j]][langs[k]] =
          bundles[i].getString(stringIds[j]).getTranslation(langs[k]);
      }
    }
  }
  return fs.writeFileAsync(file, JSON.stringify(json, null, 2));
};


IO.prototype.convert = function() {
  var self = this;
  return this.read().then(function(x) {
    self.write(x);
  });
};

module.exports = IO;
