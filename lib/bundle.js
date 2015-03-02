function Bundle(options) {
  this.id = options.id;
  this.path = options.path;
  this.strings = options.strings;
}

Bundle.prototype.getId = function() {
  return this.id;
};

Bundle.prototype.getPath = function() {
  return this.path;
};

Bundle.prototype.getStrings = function() {
  return this.strings;
};

Bundle.prototype.getString = function(id, lang) {
  return this.strings[id];
};

Bundle.prototype.getTranslation = function(id, lang) {
  return this.strings[id].getTranslation(lang);
};

Bundle.prototype.getIds = function() {
  return Object.keys(this.strings);
};

Bundle.prototype.getLanguages = function() {
  var id, set = {}, i, len, lang;
  for (id in this.strings) {
    if (this.strings.hasOwnProperty(id)) {
      lang = this.strings[id].getLanguages();
      for (i = 0, len =lang.length ; i < len; ++i) {
        set[lang[i]] = true;
      }
    }
  }
  return Object.keys(set);
};

Bundle.prototype.hasPlaceholders = function(first_argument) {
  var id;
  for (id in this.strings) {
    if (this.strings.hasOwnProperty(id)) {
      if (this.strings[id].hasPlaceholders()) {
        return true;
      }
    }
  }
  return false;
};

module.exports = Bundle;