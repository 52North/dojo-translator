
var Bluebird = require('bluebird');

function Comparator(options) {
  this.referenceLang = options.reference || [];
}

Comparator.prototype.copyMissingObjects = function(from, to) {
  var key;
  for (key in from) {
    if (from.hasOwnProperty(key)) {
      if (!to.hasOwnProperty(key)) {
        to[key] = from[key];
      }
    }
  }
};

Comparator.prototype.bundleArrayAsObject = function(bundles) {
  var reducer = function(o, b) {
    o[b.getId()] = b; return o;
  };
  return bundles.reduce(reducer, {});
};

Comparator.prototype.synchronizeBundleSets = function(a, b) {
  a = this.bundleArrayAsObject(a);
  b = this.bundleArrayAsObject(b);
  this.copyMissingObjects(a, b);
  this.copyMissingObjects(b, a);

  var id;
  for (id in a) {
    if (a.hasOwnProperty(id)) {
      this.synchronizeBundles(a[id], b[id]);
    }
  }
};

Comparator.prototype.synchronizeBundles = function(a, b) {
  a = a.getStrings();
  b = b.getStrings();
  this.copyMissingObjects(a, b);
  this.copyMissingObjects(b, a);

  var id;
  for (id in a) {
    if (a.hasOwnProperty(id)) {
      this.synchronizeLanguages(a[id], b[id]);
    }
  }
};

Comparator.prototype.synchronizeLanguages = function(a, b) {
  a = a.getTranslations();
  b = b.getTranslations();
  this.copyMissingObjects(a, b);
  this.copyMissingObjects(b, a);
};


Comparator.prototype.diff = function(a, b) {
  a = this.bundleArrayAsObject(a);
  b = this.bundleArrayAsObject(b);
  function hasOwnProperty(key) { return function(object) { return object.hasOwnProperty(key); }; }
  function getBundle(id) { return function(object) { return object[id]; }; }
  function getStrings(bundle) { return bundle.getStrings(); }
  function getTranslations(id) { return function(string) { return string[id].getTranslations(); }; }
  function getTranslation(lang) { return function(object) { return object[lang]; }; }

  var difference = {};
  var sets = [a, b];
  var bundleId, stringId, lang, values, strings, translations, references;

  for (bundleId in sets[0]) {
    if (sets.every(hasOwnProperty(bundleId))) {
      bundles = sets.map(getBundle(bundleId));
      strings = bundles.map(getStrings);
      for (stringId in strings[0]) {
        if (strings.every(hasOwnProperty(stringId))) {

          translations = strings.map(getTranslations(stringId));

          for (lang in translations[0]) {
            if (translations.every(hasOwnProperty(lang))) {

              values = translations.map(getTranslation(lang));

              for (i = 1; i < values.length; ++i) {

                if (values[i] !== values[0]) {
                  difference[bundleId] = difference[bundleId] || {};
                  difference[bundleId][stringId] = difference[bundleId][stringId] || {};
                  difference[bundleId][stringId][lang] = values;
                  references = new Array(this.referenceLang.length);
                  for (j = 0; j < this.referenceLang.length; ++j) {
                    //console.log(this.referenceLang[j]);
                    references[j] = translations[j][this.referenceLang[j]];
                  }

                  difference[bundleId][stringId][lang].push({ref: references});
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  return difference;
};

Comparator.prototype.run = function(a, b) {
  this.synchronizeBundleSets(a, b);
  console.log(JSON.stringify(this.diff(a, b), null, 2));
  return Bluebird.all([a, b]);
};

module.exports = Comparator;
