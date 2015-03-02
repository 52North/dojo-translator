function LocalizedString(options) {
  this.id = options.id;
  this.translations = options.translations || {};
}

LocalizedString.prototype.getId = function() {
  return this.id;
};

LocalizedString.prototype.hasTranslation = function(lang) {
  return !!this.translations[lang];
};

LocalizedString.prototype.getTranslation = function(lang) {
  var x = this.translations[lang];
  return x ? x : null;
};
LocalizedString.prototype.addTranslation = function(lang, value) {
  this.translations[lang] = value;
};

LocalizedString.prototype.getLanguages = function() {
  return Object.keys(this.translations);
};

LocalizedString.prototype.hasPlaceholders = function() {
  var lang, re = /\$\{.*\}/;
  for (lang in this.translations) {
    if (this.translations.hasOwnProperty(lang)) {
      if (this.translations[lang].search(re) > 0) {
        return true;
      }
    }
  }
  return false;
};

module.exports = LocalizedString;