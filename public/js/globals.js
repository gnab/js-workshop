var iter = {
  forEach: function (list, func) {
    for (var key in list) {
      func(list[key], key, list);
    }
  },
  filter: function(list, func) {
    var res = [];
    this.forEach(list, function(element, index, list) {
      if (func(element, index, list)) {
        res.push(element);
      }
    });
    return res;
  },
  map: function(list, func) {
    var res = [];
    this.forEach(list, function(element, index, list) {
      res.push(func(element, index, list));
    });
    return res;
  },
  every: function(list, func) {
    var res = true;
    this.forEach(list, function(element, index, list) {
      res = res && func(element, index, list);
    });
    return res;
  },
  reduce: function(list, func, initial) {
    var accumelator = initial;
    this.forEach(list, function(element, index, list) {
      accumelator = func(accumelator, element, index, list);
    });
    return accumelator;
  },
  groupBy: function(list, keyFunc, valFunc) {
    var groups = {};
    iter.forEach(list, function(element, index, list) {
      var key = element[0];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(element[1]);
    });
    return groups;
  }
}
