function LocalizedString(options) {
  this.id = options.id;
  this.translations = options.translations || {};
}

LocalizedString.prototype.getId = function() {
  return this.id;
};

LocalizedString.prototype.hasTranslation = function(lang) {
  return this.translations[lang] !== undefined;
};

LocalizedString.prototype.getTranslation = function(lang) {
  return this.translations[lang];
};
LocalizedString.prototype.addTranslation = function(lang, value) {
  this.translations[lang] = value;
};
LocalizedString.prototype.setTranslation = LocalizedString.prototype.addTranslation;

LocalizedString.prototype.getLanguages = function() {
  return Object.keys(this.translations);
};

module.exports = LocalizedString;
