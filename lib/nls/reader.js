var fs = require('then-fs');
var Promise = require('promise');
var path = require('path');

var Bundle = require('../bundle');
var LocalizedString = require('../localizedstring');
var strings = require('../util').strings;
var arrays = require('../util').arrays;
var objects = require('../util').objects;

function readStats(path) {
  return fs.stat(path).then(function(stats) {
    if (!stats.isDirectory())
      return Promise.resolve(null);
    if (strings.endsWith(path, 'nls'))
      return readNLSDirectory(path);
    return readDirectory(path);
  });
}

function notEmptyOrNull(arr) {
  if (arrays.isArray(arr)) {
    return arr.length > 0;
  } else {
    return arr !== null;
  }
}

function readDirectory(dir) {
  return fs.readdir(dir).then(function(paths) {
    var i, len = paths.length,
        results = new Array(len);
    for (i = 0; i < len; ++i) {
      results.push(readStats(path.join(dir, paths[i])));
    }
    return Promise.all(results).then(function(paths) {
      return paths.filter(notEmptyOrNull);
    });
  });
}

function readNLSDirectory(dir) {
  return fs.readdir(dir).then(function(paths) {
    var i, len = paths.length, lang = [];
    for (i = 0; i < len; ++i) {
      if (paths[i] !== 'bundle.js') {
        lang.push(paths[i]);
      }
    }
    return {
      path: dir,
      lang: lang
    };
  });
}

function NLSReader(options) {
  this.baseDir = path.resolve(path.join(options.baseDir || '.', 'bundles'));
  this.bundle = options.bundle ? options.bundle : null;
}

NLSReader.prototype.findNLSFiles = function(dir) {
  return readDirectory(dir).then(arrays.flatten);
};

NLSReader.prototype.readLangFile = function(nls, lang) {
  var result = null;

  if (lang) {
    global.define = function(x) {
      result = objects.flatten(x);
    };
    require(path.join(nls.path, lang, 'bundle.js'));
  } else {
    global.define = function(x) {
      result = objects.flatten(x.root);
    };
    require(path.join(nls.path, 'bundle.js'));
  }
  delete global.define;
  return result;
};

NLSReader.prototype.readBundleContent = function(nls) {
  // thanks to global.define we
  // have to do this in sync
  var lang = {};
  var i, len = nls.lang.length;
  lang.en = this.readLangFile(nls);
  for (i = 0; i < len; ++i) {
    lang[nls.lang[i]] = this.readLangFile(nls, nls.lang[i]);
  }
  nls.lang = lang;
  return nls;
};

NLSReader.prototype.readBundleContents = function(nls) {
  var i, len = nls.length, bundles = new Array(len);
  for (i = 0; i < len; ++i) {
    nls[i] = this.readBundleContent(nls[i]);
  }
  return nls;
};

NLSReader.prototype.createBundles = function(nls) {
  var i, len = nls.length, bundles = new Array(len);
  for (i = 0; i < len; ++i) {
    bundles[i] = this.createBundle(nls[i]);
  }
  return bundles;
};

NLSReader.prototype.createBundle = function(nls) {
  var id = nls.path
      .replace(this.baseDir + path.sep, '')
      .replace(path.sep + 'nls', '')
      .replace(new RegExp(path.sep, 'g'), '.');
  var strings = {}, key, lang, translations;
  for (lang in nls.lang) {
    for (key in nls.lang[lang]) {
      if (!strings[key]) {
        strings[key] = new LocalizedString({id: key});
      }
      strings[key].addTranslation(lang, nls.lang[lang][key]);
    }
  }

  return new Bundle({
    id: id,
    path: nls.path,
    strings: strings
  });
};

NLSReader.prototype.parse = function() {
  var self = this;
  var directory = this.baseDir;
  if (this.bundle) {
    directory = path.join(this.baseDir,
      this.bundle.replace(/\./g, path.sep));
  }
  return this.findNLSFiles(directory)
    .then(function(x) {
      return self.readBundleContents(x);
    })
    .then(function(x) {
      return self.createBundles(x);
    });

};

module.exports = NLSReader;