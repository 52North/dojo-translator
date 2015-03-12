var request = require('request');
var Bluebird = require('bluebird');
var Bundle = require('./bundle');
var strings = require('./util').strings;
var util = require('util');
var LocalizedString = require('./localizedstring');
var async = require('async');
var colors = require('colors');

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
  if (!options.key) throw new Error("Missing API key");
  this.key = options.key;
  this.noop = options.noop;
  this.sourceLang = options.sourceLang || 'en';
  this.cache = new Cache();
  this.concurrency = options.concurrency || 20;
  this.retryLimit = options.retryLimit || 10;
  var self = this;
  this.queue = retryingQueue(function(task, callback) {
    self.queueWorker(task, callback);
  }, {
    concurrency: this.concurrency,
    retryLimit: 5
  });
  this.request = request.defaults({
    useQuerystring: true,
    url: 'https://www.googleapis.com/language/translate/v2'
  });
}

function retryingQueue(fun, options) {
  options.concurrency = options.concurrency || Infinity;
  options.retryLimit = options.retryLimit || 1;
  return async.queue(function(task, cb) {
    var t = { task: task, retry: 1 };
    var callback = function(err) {
      if (err) {
        t.retry++;
        if (t.retry <= options.retryLimit) {
          fun(t.task, callback);
        } else {
          cb(err);
        }
      } else {
        cb();
      }
    };
    fun(t.task, callback);
  }, options.concurrency);
}

Translator.prototype.queueWorker = function(task, callback) {
  var self = this;
  var tlang = task.tlang;
  var slang = task.slang;
  var s = task.string;
  var ss = s.getTranslation(slang);
  console.log('Processing task ' + task.string.getId().cyan + ' (' + slang.green + ') -> ' + tlang.yellow);
  if (this.cache.has(slang, ss, tlang)) {
    this.cache.get(slang, ss, tlang).then(function(x) {
      s.addTranslation(tlang, x);
      return callback();
    });
  }

  if (s.hasTranslation(tlang)) {
    console.warn(('Translation for "' + tlang + '" is already present for "' + s.getId() + '"').red);
    return callback();
  }
  if (ss === undefined) {
    console.warn(('Translation for "' + slang + '" is not present for "' + s.getId() + '"').red);
    return callback();
  }
  // ss may be defined as empty or null
  if (!ss) {
    s.addTranslation(tlang, ss);
    return callback();
  }

  var qs = {
    key: this.key,
    source: slang,
    target: tlang,
    q: ss
  };

  if (this.noop) {
    return Bluebird.delay(50).done(function() {
      s.addTranslation(tlang, ss);
      return callback();
    });
  }

  this.request({
    qs: qs
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }
    if (response.statusCode !== 200) {
      return callback(body);
    }
    var t = JSON.parse(body).data.translations[0].translatedText;
    console.log("Translation: '" + ss + "' (" + slang.green + ") -> '" + t + "' (" + tlang.yellow + ")");
    s.addTranslation(tlang, t);
    return callback();
  });
};

Translator.prototype.translateBundle = function(bundle, tlang) {
  console.log('Translating', bundle.getId().cyan, 'to', tlang.yellow);
  var self = this;
  return Bluebird
    .all(bundle.getIds())
    .map(function(key) {
      return bundle.getString(key);
    })
    .map(function(s) {
      return self.translateLocalizedString(bundle, s, tlang);
    })
    .then(function() {
      return Bluebird.resolve(bundle);
    });
};

Translator.prototype.translateLocalizedString = function(bundle, s, tlang) {
  var self = this;
  console.log("Translating", (bundle.getId() + '.' + s.getId()).cyan, "to", tlang.yellow);
  return new Bluebird(function(resolve, reject) {
    self.queue.push({
      tlang: tlang,
      slang: self.sourceLang,
      string: s
    }, function(err) {
      if (err) {
        console.warn('Can not translate string ' + s.getId().cyan +
          ' of bundle ' + bundle.getId().cyan + ' to ' + tlang.yellow, err);
      }
      resolve(s);
    });
  });
};

Translator.prototype.translate = function(bundles, lang) {
  var self = this;
  var jobs = [];
  bundles.forEach(function(bundle) {
    lang.forEach(function(lang) {
      jobs.push(self.translateBundle(bundle, lang));
    });
  });
  return Bluebird.all(jobs).then(function() {
    console.log("Translation complete".green);
    return bundles;
  });
};

module.exports = Translator;
