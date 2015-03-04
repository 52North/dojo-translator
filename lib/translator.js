var request = require('request');
var Promise = require('bluebird');
var Bundle = require('./bundle');
var strings = require('./util').strings;
var util = require('util');
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

function Translator(options) {
  if (!options.key) {
    throw new Error("Missing API key");
  }
  this.key = options.key;
  this.noop = options.noop;
  this.sourceLang = options.sourceLang || 'en';
  this.cache = new Cache();
  this.concurrency = options.concurrency || 20;
  this.request = request.defaults({
    useQuerystring: true,
    pool: { maxSockets: this.concurrency },
    url: 'https://www.googleapis.com/language/translate/v2',
    timeout: 5000
  });
}

Translator.prototype.translateBundle = function(bundle, tlang) {
  var self = this;
  Promise
    .all(bundle.getIds())
    .map(function(key) {
      return bundle.getString(key);
    })
    .map(function(s) {
      return self.translateLocalizedString(s, tlang);
    }, { concurrency: self.concurrency })
    .all()
    .then(function() {
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

  if (self.cache.has(slang, ss, tlang)) {
    return self.cache.get(slang, ss, tlang);
  }

  return new Promise(function (resolve, reject) {
    if (s.hasTranslation(tlang)) {
      console.warn(('Translation for "' + tlang + '" is already present for "' + s.getId() + '"').red);
      return resolve(s);
    }
    if (ss === undefined) {
      console.warn(('Translation for "' + slang + '" is not present for "' + s.getId() + '"').red);
      return resolve(s);
    }
    // ss may be defined as empty or null
    if (!ss) {
      s.addTranslation(tlang, ss);
      return resolve(s);
    }

    var qs = { key: self.key, source: slang, target: tlang, q: ss };

    //console.log('?' + Object.keys(qs).map(function(x) {
    //  return x + '=' + encodeURIComponent(qs[x]); }).join('&'));

    console.log("Translating: '" + ss + "' (" + slang + ") -> " + tlang);

    if (self.noop) {
      return Promise.delay(500).done(function() {
        s.addTranslation(tlang, ss);
        resolve(s);
      });

    }

    self.request({ qs: qs }, function(err, response, body) {
      if (err) { return reject(err); }
      if (response.statusCode !== 200) { return reject(body); }
      var t = JSON.parse(body).data.translations[0].translatedText;
      console.log("Translation: '" + ss + "' (" + slang + ") -> '" + t + "' (" + tlang + ")");
      s.addTranslation(tlang, t);
      resolve(s);
    });
  });
};

Translator.prototype.translate = function(x, lang) {
  if (x instanceof Bundle) {
    return this.translateBundle(x, lang);
  }
  if (x instanceof LocalizedString) {
    return this.translateLocalizedString(x, lang);
  }
  throw new Error('Neither a Bundle nor a LocalizedString');
};

module.exports = Translator;

