var NLSReader = require('./nls/reader');
var NLSWriter = require('./nls/writer');
var Bluebird = require('bluebird');
var Bundle = require('./bundle');
var LocalizedString = require('./localizedstring');
var fs = Bluebird.promisifyAll(require('fs'));

function Converter(options) {
  this.source = options.source;
  this.target = options.target;
  var stats = fs.statSync(this.source);
  if (stats.isDirectory()) {
    this.sourceType = 'directory';
    this.targetType = 'file';
  } else if (stats.isFile()) {
    this.sourceType = 'file';
    this.targetType = 'directory';
  } else {
    throw new Error(source + ' is neither a file nor a directory');
  }
}

Converter.prototype.read = function() {
  console.log("reading", this.sourceType);
  switch (this.sourceType) {
    case 'file':
    return this.readSingleFile(this.source);
    case 'directory':
      return new NLSReader({ baseDir: this.source }).parse();
  }
};

Converter.prototype.write = function(bundles) {
  console.log("writing", this.targetType);
  switch (this.targetType) {
    case 'file':
      return this.writeSingleFile(bundles, this.target);
    case 'directory':
      return new NLSWriter({ target: this.target }).writeBundle(bundles);
  }
};

Converter.prototype.readSingleFile = function(file) {
  return fs.readFileAsync(file, 'utf8').then(function(file) {
    var json = JSON.parse(file);
    var bundleName, stringName, bundles = [], strings, langName;
    for (bundleName in json) {
      strings = {};
      for (stringName in json[bundleName]) {
        strings[stringName] = new LocalizedString({
          id: stringName, translations: json[bundleName][stringName]
        });
      }
      bundles.push(new Bundle({ id: bundleName, strings: strings }));
    }
    return bundles;
  });
};

Converter.prototype.writeSingleFile = function(bundles, file) {
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


Converter.prototype.convert = function() {
  var self = this;
  return this.read().then(function(x) {self.write(x);});
};

module.exports = Converter;