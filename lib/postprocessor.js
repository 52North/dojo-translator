
var Bluebird = require('bluebird');
var colors = require('colors');
var readline = require('readline');
var deasync = require('deasync');

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

PostProcessor.prototype.question = function(question, content) {
  var a = null;
  this.input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  this.input.question(question, function(answer) { a = answer; });
  if (content) {
    this.input.write(content);
  }
  while (a === null) {
    deasync.sleep(100);
  }
  this.input.close();
  return a;
};

PostProcessor.prototype.process = function(bundles) {
  var i, len = bundles.length;
  for (i = 0; i < len; ++i) {
    this.processBundle(bundles[i]);
  }
  return Promise.resolve(bundles);
};

PostProcessor.prototype.processBundle = function(bundle) {
  var self = this;
  var i, id, ids = bundle.getIds(), len = ids.length;
  for (i = 0; i < len; ++i) {
    id = ids[i];
    this.processString(bundle.getId(), bundle.getString(id));
  }
};

PostProcessor.prototype.processString = function(bundleId, string) {
  var gid = bundleId + "." + string.getId();
  var reference = string.getTranslation(this.referenceLang);
  var langs = string.getLanguages();
  var i, j;
  var check;
  //console.log('Processing'.magenta + ' [' + gid.blue + ']');
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
    //this.warn(x, 'Reference is null', true);
    return false;
  }
  if (x.reference ===  undefined) {
    //this.warn(x, 'Reference is undefined', true);
    return false;
  }
  if (x.reference === '') {
    //this.warn(x, 'Reference is empty', true);
    return false;
  }
};


PostProcessor.prototype.checkIdentical = function(x) {
  if (x.reference ===  x.translation) {
    //this.warn(x, 'Translation is identical to reference');
    return false;
  }
};

PostProcessor.prototype.checkEllipse = function(x) {
  if (x.reference.search(/.../g) > 0 && x.translation.search(/.../g) < 0) {
    this.warn(x, 'Found ellipse in reference but not in translation');
  }
};


PostProcessor.prototype.correctPlaceHolders = function(x) {
  function replacer(match, name) {
    // check if name correlates to a variable in the reference
    var refName = x.reference.match(new RegExp('\\$\\{(' + name + ')\\}', 'i'));
    return refName ? '${' + refName[1] + '}' : match;
  }
  // $ {asdf} -> ${asdf}
  x.translation = x.translation.replace(/\$ \{([^}]*)\}/g, '$${$1}');
  // ${} name > ${name}
  x.translation = x.translation.replace(/\$\{\} ([a-zA-Z]+)/g, replacer);
  // ${Name} > ${name}
  x.translation = x.translation.replace(/\$\{([a-zA-Z]+)\}/g, replacer);
  // {$ name} > ${name}
  x.translation = x.translation.replace(/\{\$ ?([a-zA-Z]+)\}/g, replacer);

};

PostProcessor.prototype.interactiveEdit = function(x) {
  x.translation = this.question('Edit> ', x.translation);
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
      this.warn(x, 'Translation is missing ' + 'all'.cyan + ' variables');
      this.interactiveEdit(x);
    } else {
      if (tMatch.length != refMatch.length) {
        this.warn(x, 'Translation is missing  ' + (refMatch.length - tMatch.length) + ' variables');
        this.interactiveEdit(x);
      } else {
        this.checkMatchDifference(x, refMatch, tMatch);
      }
    }
  }
};

function findMissing(a, b) {
  var i, j, found, missing = [];
  for (i = 0; i < a.length; ++i) {
    found = false;
    for (j = 0; j < b.length; ++j) {
      if (a[i] === b[j]) {
        found = true;
      }
    }
    if (!found) {
      missing.push(a[i]);
    }
  }
  return missing;
}

PostProcessor.prototype.checkMatchDifference = function(x, refMatch, tMatch) {
  var i;
  var missingInRef = findMissing(tMatch, refMatch);
  var missingInTrans = findMissing(refMatch, tMatch);
  if (missingInRef.length === 1 && missingInTrans.length === 1) {
    x.translation.replace(missingInRef[0], missingInTrans[0]);
  } else if ((missingInTrans.length + missingInRef.length) > 0){
    for (i = 0; i < missingInTrans.length; ++i) {
      this.warn(x, 'Variable ' + missingInTrans[i].cyan + ' is not present in ' + 'translation'.yellow + '.');
    }
    for (i = 0; i < missingInRef.length; ++i) {
      this.warn(x, 'Variable ' + missingInRef[i].cyan + ' is not present in ' + 'reference'.green + '.');
    }
    this.interactiveEdit(x);
  }
};

module.exports = PostProcessor;