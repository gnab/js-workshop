var globals = {
  forEach: function (list, func) {
    for (var i = 0; i < list.length; i++) {
      func(list[i], i, list);
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
  }
}
