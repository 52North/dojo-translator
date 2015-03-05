
var Bluebird = require('bluebird');
var colors = require('colors');

function PostProcessor(options) {
  this.referenceLang = options.referenceLang || 'en';
  this.checks = [
    this.checkEmptyOrNull,
    this.checkIdentical,
    this.checkEllipse,
    this.correctPlaceHolders,
    this.checkPlaceHolders
  ];
}

PostProcessor.prototype.process = function(bundles) {
  var self = this;
  return Bluebird.all(bundles)
    .map(function(bundle) { return self.processBundle(bundle); });
};

PostProcessor.prototype.processBundle = function(bundle) {
  var self = this;
  return Bluebird.all(bundle.getIds())
    .map(function(id) {
      return self.processString(bundle.getId(), bundle.getString(id));
    })
    .then(function() { return bundle; });
};

PostProcessor.prototype.processString = function(bundleId, string) {
  var gid = bundleId + "." + string.getId();
  var reference = string.getTranslation(this.referenceLang);
  var langs = string.getLanguages();
  var i, j;
  var check;
  console.log('Processing'.magenta + ' [' + gid.blue + ']');
  for (i = 0; i < langs.length; ++i) {
    lang = langs[i];
    if (lang === this.referenceLang) {
      continue;
    }
    check = {
      id : gid + '.' + lang,
      reference: reference,
      orig: string.getTranslation(lang),
      translation: string.getTranslation(lang)
    };
    for (j = 0; j < this.checks.length; ++j) {
      if (this.checks[j].call(this, check) === false) {
        break;
      }
    }
    if (check.orig !== check.translation) {
      console.log('Updated'.green + ' [' + check.id.blue + "]: '" + check.orig.green + "' -> '" + check.translation.yellow + "'");
      string.setTranslation(lang, check.translation);
    }
  }
  return string;
};

PostProcessor.prototype.warn = function(x, message, omitValues) {
  message = 'WARNING'.red + ' [' + x.id.blue +  '] ' + message;
  if (omitValues) {
    console.log(message);
  } else {
    console.log(message + ': ' + x.reference.green + ' -> ' + x.translation.yellow);
  }
};

PostProcessor.prototype.checkEmptyOrNull = function(x) {
  if (x.reference ===  null) {
    this.warn(x, 'Reference is null', true);
    return false;
  }
  if (x.reference ===  undefined) {
    this.warn(x, 'Reference is undefined', true);
    return false;
  }
  if (x.reference === '') {
    this.warn(x, 'Reference is empty', true);
    return false;
  }
};


PostProcessor.prototype.checkIdentical = function(x) {
  if (x.reference ===  x.translation) {
    this.warn(x, 'Translation is identical to reference');
    return false;
  }
};

PostProcessor.prototype.checkEllipse = function(x) {
  if (x.reference.search(/.../g) > 0 && x.translation.search(/.../g) < 0) {
    this.warn(x, 'Found ellipse in reference but not in translation');
  }
};


PostProcessor.prototype.correctPlaceHolders = function(x) {
  var re = /\$ \{[^}]*\}/g;
  var match = x.translation.match(re);
  if (match) {
    var variables = match.map(function(x) {
      return x.replace("$ {", "${");
    });
    for (var i = 0; i < match.length; ++i) {
      x.translation = x.translation.replace(match[i], variables[i]);
    }
  }
};

PostProcessor.prototype.checkPlaceHolders = function(x) {
  var re = /\$\{[^}]*\}/g;
  var refMatch = x.reference.match(re);
  var tMatch = x.translation.match(re);
  if (refMatch === null) {
    if (tMatch !== null) {
      this.warn(x, 'Reference contained no variables');
    }
  } else {
    if (tMatch === null) {
      this.warn(x, 'Translation is missing all ' + refMatch.length + ' variables');
    } else {
      if (tMatch.length != refMatch.length) {
        this.warn(x, 'Translation is missing  ' + (refMatch.length - tMatch.length) + ' variables');
      } else {
        this.checkMatchDifference(x, refMatch, tMatch);
      }
    }
  }
  return true;
};

PostProcessor.prototype.checkMatchDifference = function(x, refMatch, tMatch) {
  var i, j, found;
  for (i = 0; i < refMatch.length; ++i) {
    found = false;
    for (j = 0; j < tMatch.length; ++j) {
      if (refMatch[i] === tMatch[i]) {
        found = true;
      }
    }
    if (!found) {
      this.warn(x, 'Variable ' + refMatch[i].cyan + ' is not present in translation.');
    }
  }
};

module.exports = PostProcessor;