var util = require('util');

function countCharacters(o) {
  var count = 0;
  var i, len, key;

  if (typeof o == 'string' || o instanceof String) {
    count += o.length;
  } else if (arrays.isArray(o)) {
    for (i = 0, len = o.length; i < len; ++i) {
      count += countCharacters(o[i]);
    }
  } else {
    for (key in o) {
      if (o.hasOwnProperty(key)) {
        count += countCharacters(o[key]);
      }
    }
  }
  return count;
}


var strings = {
  endsWith: function(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  },
  isString: function(x) {
    return typeof x === 'string' || x instanceof String;
  }
};

var objects = {
  flatten: function(o) {
    var res = {};

    function flatten(prefix, o) {
      for (var key in o) {
        if (o.hasOwnProperty(key)) {
          if ((typeof o[key]) === 'object') {
            flatten(prefix + '.' + key, o[key]);
          } else if (o[key] !== undefined) {
            res[prefix + '.' + key] = o[key];
          }
        }
      }
    }
    for (var key in o) {
      if (o.hasOwnProperty(key)) {
        if ((typeof o[key]) === 'object') {
          flatten(key, o[key]);
        } else if (o[key] !== undefined) {
          res[key] = o[key];
        }
      }
    }
    return res;
  },
  countCharacters: countCharacters
};

var arrays = {
  flatten: function(arr) {
    if (!util.isArray(arr)) return arr;
    var i, len = arr.length,
      res = [];
    for (i = 0; i < len; ++i) {
      if (util.isArray(arr[i])) {
        if (arr.length > 0) {
          res.push.apply(res, arrays.flatten(arr[i]));
        }
      } else if (arr[i]) {
        res.push(arr[i]);
      }
    }
    return res;
  },
  isArray: util.isArray,
  countCharacters: countCharacters
};



module.exports = {
  strings: strings,
  arrays: arrays,
  objects: objects,
  countCharacters: countCharacters
};
