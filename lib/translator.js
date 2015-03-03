var request = require('request');
var Promise = require('promise');
var Bundle = require('./bundle');
var strings = require('./util').strings;
var LocalizedString = require('./localizedstring');
require('colors');

function Cache() {
  this.values = {};
}

Cache.prototype.add = function(slang, s, tlang, t) {
  if (!this.values[slang]) {
    this.values[slang] = {};
  }
  if (!this.values[slang][s]) {
    this.values[slang][s] = {};
  }
  this.values[slang][s][tlang] = t;
};

Cache.prototype.get = function(slang, s, tlang) {
  var value;
  if (this.values[slang]) {
    if (this.values[slang][s]) {
      value = this.values[slang][s][tlang];
    }
  }
  return value ? value : null;
};

Cache.prototype.has = function(slang, s, tlang) {
  return this.get(slang, s, tlang) !== null;
};

var cache = new Cache();


function Translator(options) {
  this.key = options.key;
  this.noop = options.noop;
  this.sourceLang = options.sourceLang || 'en';
  this.url = 'https://www.googleapis.com/language/translate/v2';
  this.cache = cache;
}

Translator.prototype.translateBundle = function(bundle, tlang) {
  var self = this;
  var ids = bundle.getIds();
  var strings = ids.map(function(key) {
    return bundle.getString(key);
  });
  var translations = strings.map(function(s) {
    return self.translateLocalizedString(s, tlang);
  });
  return Promise.all(translations).then(function() {
    return Promise.resolve(bundle);
  }, function(err) {
    err.message = 'Can not translate bundle ' + bundle.getId() +': ' + err.message;
    throw err;
  });
};

Translator.prototype.translateLocalizedString = function(s, tlang) {
  var self = this;
  var slang = this.sourceLang;
  var ss = s.getTranslation(slang);
  var promise;
  if (self.cache.has(slang, ss, tlang)) {
    promise = self.cache.get(slang, ss, tlang);
  } else {
    promise = new Promise(function (resolve, reject) {
      var qs;
      if (s.hasTranslation(tlang)) {
        console.warn(('Translation for "' + tlang + '" is already present for "' + s.getId() + '"').red);
        return resolve(s);
      }
      if (ss === undefined) {
        console.warn(('Translation for "' + slang + '" is not present for "' + s.getId() + '"').red);
        return resolve(s);
      }
      // ss may be defined as null
      if (!ss) {
        s.addTranslation(tlang, ss);
        return resolve(s);
      }
      qs = { key: self.key, source: slang, target: tlang, q: ss };

      console.log(self.url + '?' + Object.keys(qs).map(function(x) { return x + '=' + encodeURIComponent(qs[x]); }).join('&'));

      if (self.noop) {
        return resolve(s);
      }

      request({
        uri: self.url,
        useQuerystring: true,
        qs: qs
      }, function(err, message, response) {
        var translation;
        if (err) {
          return reject(err);
        }
        translation = response.data.translations[0];
        s.addTranslation(tlang, translation);
        resolve(s);
      });
    });
  }
  return promise;
};

Translator.prototype.translate = function(x, lang) {
  if (x instanceof Bundle) {
    return this.translateBundle(x, lang);
  } else if (x instanceof LocalizedString) {
    return this.translateLocalizedString(x, lang);
  } else {
    return new Promise(function(resolve, reject) {
      reject(new Error("Neither a Bundle nor a LocalizedString"));
    });
  }
};

module.exports = Translator;

