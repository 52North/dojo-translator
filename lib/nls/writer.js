
var Bluebird = require('bluebird');
var path = require('path');
var fs = Bluebird.promisifyAll(require('fs'));
var mkdir = Bluebird.promisify(require('mkdirp'));
var util = require('util');


function NLSWriter(options) {
  this.defaultLang = options.defaultLang || 'en';
  this.target = options.target;

}

function put(object, path, value) {
  path = path.split('.');
  var i, len = path.length;

  for (i = 0; i < len - 1; ++i) {
    if (!object[path[i]]) {
      object[path[i]] = {};
    }
    object = object[path[i]];
  }
  object[path[len - 1]] = value;
}

NLSWriter.prototype.bundleToJSON = function(bundle, lang) {
  if (lang) {
    var json = {}, i, id = bundle.getIds(), len = id.length;
    var tranlation, path;
    for (i = 0; i < len; ++i) {
      tranlation = bundle.getTranslation(id[i], lang);
      put(json, id[i], tranlation);
    }
    return json;
  } else {
    return this.bundleToJSON(bundle, this.defaultLang);
  }
};

NLSWriter.prototype.bundleToString = function(bundle, lang) {
  var string = '';
  var json = this.bundleToJSON(bundle, lang);
  if (!lang) {
    json = { root: json };
    var self = this;
    bundle.getLanguages()
        .filter(function(x) {return x !== self.defaultLang;})
        .forEach(function(e) { json[e] = true; });
  }
  return 'define(' + JSON.stringify(json, null, 2) + ');';
};

NLSWriter.prototype.getFile = function(bundle, lang) {
  var relPath = bundle.getId().replace(/\./g, path.sep);
  var basePath = path.join(this.target, 'bundles', relPath, 'nls');
  if (lang) {
    basePath = path.join(basePath, lang);
  }
  return path.join(basePath, "bundle.js");
};

NLSWriter.prototype.writeLang = function(bundle, lang) {
  var file = this.getFile(bundle, lang);
  var content = this.bundleToString(bundle, lang);
  return mkdir(path.dirname(file)).then(function() {
    return fs.writeFileAsync(file, content);
  });
};

NLSWriter.prototype.writeBundle = function(bundle) {
  var self = this;
  if (util.isArray(bundle)) {
    return Bluebird.all(bundle).map(function(x) {
      return self.writeBundle(x);
    });
  }
  var lang = bundle.getLanguages();
  var i, len = lang.length, p = new Array(len);
  this.writeLang(bundle);
  for (i = 0; i < len; ++i) {
    if (lang[i] !== this.defaultLang) {
      p[i] = this.writeLang(bundle, lang[i]);
    }
  }
  return Bluebird.all(p);
};

module.exports = NLSWriter;