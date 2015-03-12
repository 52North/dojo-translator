
var Bluebird = require('bluebird');


function Comparator() {

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


Comparator.prototype.run = function(a, b) {
  this.synchronizeBundleSets(a, b);
  return Bluebird.all([a, b]);
};

module.exports = Comparator;
