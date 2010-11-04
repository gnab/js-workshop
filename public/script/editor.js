window.onBespinLoad = function() {
  bespin.useBespin('editor', {
    stealFocus: true,
    syntax: 'js',
    settings: {
      tabstop: 2,
      fontsize: 14,
      fontface: 'mono, Monaco, Consolas, "Lucida Console", "Courier New"'
    }
  }).then(function(env) {
    setUpLog(env.editor);
    setUpEvaluation(env.editor);
    setUpLayout(env.editor);
    setUpTaskbar(env.editor);
    updateLayout();
  });
};

$(document).ready(function() {
  $(window).resize(updateLayout);
  updateLayout();
});

function assert(expr) {
  if (expr !== true) {
    throw 'Assertion failed!';
  }
}

function setUpLog(editor) {
  var log = $('#log');

  if (typeof(console) !== 'undefined') {
    console = {};
  }

  extendMethod(console, 'log', function(obj) {
    appendToLog(log, obj);
  });

  extendMethod(console, 'error', function(obj) {
    appendToLog(log, obj, 'error');
  });

  extendMethod(console, 'info', function(obj) {
    appendToLog(log, obj, 'info');
  });

  extendMethod(console, 'clear', function() {
    log[0].innerHTML = '';
    console.info('Press Shift + Enter to evaluate code ' +
      '(+ Control to clear log as well)');
  });

  console.clear();
}

function extendMethod(obj, method, extra) {
  var _method = obj[method];
  obj[method] = function() {
    ret = undefined;
    if (_method) {
      ret = _method.apply(obj, arguments);
    }
    args = []
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(ret);
    return extra.apply(obj, args);
  }
}

function appendToLog(log, obj, type) {
  var element = $('<div></div>');
  element.addClass(type);
  if (typeof(obj) != 'object') {
    element.text(obj);
  } else {
    var json = $('<pre />');
    json.text(JSON.stringify(obj, null, '  '));
    if (obj instanceof Error) {
      element.text(' ' + obj);
    } else {
      element.text(' [Object]');
    }
    element.addClass('closed');;
    element.append(json)
    element.click(function() {
      element.toggleClass('closed');
      element.toggleClass('open');
    });
  }
  log.append(element);
  log.scrollTop(log[0].scrollHeight);
}

function setUpEvaluation(editor) {
  $(document).keyup(function(e) {
    if (e.shiftKey && e.keyCode === 13) {
      if (e.ctrlKey) {
        console.clear();
      }
      try {
        var errorOnLine;
        var lines = editor.value.split('\n');
        var code = ''
        for (var i = 0; i < lines.length; i++) {
          code += 'errorOnLine = ' + (i+1) + ';\n';
          code += lines[i] + '\n';
        }
        eval('(function(){' + code + '})()');
      } catch(err) {
        console.error(err + ', line ' + errorOnLine);
      }
      if (!JSLINT(editor.value)) {
        for (var i = 0; i < JSLINT.errors.length; i++) {
          var lint = JSLINT.errors[i];
          console.log('jslint: ' + lint.id + ' ' + lint.reason + ' - linje ' + lint.line);
        }
      }
    }
  });
}

function setUpLayout(editor) {
  var taskbar = $('#taskbar');
  var log = $('#log');

  extendMethod(editor.gutterView, 'computeWidth', function() {
    var newWidth = arguments[arguments.length - 1];
    if (newWidth != editor._gutterViewWidth) {
      taskbar.css({
        'border-left-width': newWidth + 'px'
      });
      log.css({
        'border-left-width': newWidth + 'px'
      });
    }
    return newWidth;
  });
}

function setUpTaskbar(editor) {
  var tasks = $('#tasks');

  tasks.change(function() {
    var option = $('#tasks option:selected');
    var task = option.data('task');

    if (task) {
      editor.value = task.code;
      $('#description').html(task.description);
    }
    else {
      $('#description').html('&nbsp;');
    }

    editor.focus = true;
  });

  $.getJSON('/tasks.js', function(sections) {
    tasks.empty();
    $('<option>Select a task</option>').appendTo(tasks);

    $(sections).each(function(i, section) {
      var sectionTag = $('<optgroup label="' + section.name + 
        '"></optgroup>');

      $(section.tasks).each(function(j, task) {
        var taskTag = $('<option>' + task.name + '</option>');
        taskTag.data('task', task); 
        taskTag.appendTo(sectionTag);
      });

      sectionTag.appendTo(tasks);
    });
  });
}

function updateLayout() {
  var taskbar = $('#taskbar');
  var editor = $('#editor');
  var log = $('#log');

  var height = window.innerHeight - taskbar.outerHeight() - 
    log.outerHeight();
  var width = window.innerWidth;

  editor.css({ 
    height: height + 'px', 
    width: width + 'px'  
  });
}
