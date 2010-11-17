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
    setUpChangeLineNumber(env.editor);
    updateLayout();
  });
};

$(document).ready(function() {
  $(window).resize(updateLayout);
  updateLayout();
});

function assert (expr, msg) {
  if (expr !== true) {
    throw new Error(msg || 'Assertion failed!');
  }
}

function setUpLog(editor) {
  var log = $('#log');
  var lintlog = $('#lint');

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
    log.children().remove()
    console.info('Press Shift + Enter to evaluate code ' +
      '(+ Control to clear log as well)');
  });

  lintconsole = {
    'info': function(obj) {
      appendToLog(lintlog, obj, 'info');
    },
    'error': function(obj, line) {
      appendToLog(lintlog, obj, 'error', line);
    },
    'clear': function() {
      lintlog.children().remove()
      lintconsole.info('Lint errors:');
    }
  };

  console.clear();
  lintconsole.clear();
}

function extendMethod(obj, method, extra) {
  var _method = obj[method];
  obj[method] = function() {
    var ret, args;
    if (_method) {
      ret = _method.apply(obj, arguments);
    }
    args = Array.prototype.slice.apply(arguments);
    args.push(ret);
    return extra.apply(obj, args);
  }
}

function appendToLog(log, obj, type, line) {
  var element = $('<div></div>');
  if (type) {
    element.addClass(type);
  }
  if (typeof(obj) != 'object') {
    element.text(obj);
  } else {
    var json = $('<pre />');
    json.text(JSON.stringify(obj, null, '  '));
    if (obj instanceof Error) {
      element.text(obj + '');
    } else if (obj instanceof Array) {
      if (obj.length > 3) {
        element.text('[' + obj.slice(0, 3).join(', ') + ', ... ]');
      } else {
        element.text('[' + obj.join(', ') + ']');
      }
    } else {
      element.text(Object.prototype.toString.call(obj));
    }
    element.addClass('closed');;
    element.append(json)
    element.click(function() {
      element.toggleClass('closed');
      element.toggleClass('open');
    });
  }
  if (line) {
    element.prepend($('<span class="line" />').text('line ' + line));
  }
  log.append(element);
  log.scrollTop(log[0].scrollHeight);
}

function createSandbox(globals) {
  /* Inspired by http://dean.edwards.name/weblog/2006/11/sandbox/ */
  var iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  frames[frames.length - 1].document.write(
    "<script>"+
    "parent.sandbox={"+
    "eval: function(s){return eval(s)},"+
    "addGlobal: function(key, func) { window[key] = func }}"+
    "<\/script>"
  );

  var sandbox = window.sandbox;
  delete window.sandbox;

  for (var key in globals) {
    sandbox.addGlobal(key, globals[key]);
  }

  sandbox.destroy = function() {
    document.body.removeChild(iframe)
  };

  return sandbox;
}


function setUpEvaluation(editor) {
  $('#clear').click(function() {
    console.clear();
  });

  $('#run').click(function() {
    var sandbox = createSandbox({
      console: console,
      assert: assert,
      iter: iter
    });

    var started = new Date().getTime(), finished = null;
    try {
      sandbox.eval(editor.value);
    } catch(err) {
      // FIXME extract line number from err via stack or lineNumber
      console.error(err);
    } finally {
      finished = new Date().getTime();
      sandbox.destroy();
    }
    console.log('Finished in ' + (finished - started) + 'ms');
    checkForLintErrors(editor.value);
  });

  $('#reset').click(function() {
    var task = $('#tasks').data('current')
    delete localStorage[task.name];
    editor.value = task.code;
  });

  $(window).bind('beforeunload', function() {
    var task = $('#tasks').data('current')
    localStorage[task.name] = editor.value;
  });

  $(document).keyup(function(e) {
    if (e.shiftKey && e.keyCode === 13) {
      if (e.ctrlKey) {
        $('#clear').click();
      }
      $('#run').click();
    }
  });
}

function setUpLayout(editor) {
  var taskbar = $('#taskbar');
  var console = $('#console');

  extendMethod(editor.gutterView, 'computeWidth', function() {
    var newWidth = arguments[arguments.length - 1];
    if (newWidth != editor._gutterViewWidth) {
      taskbar.css({
        'border-left-width': newWidth + 'px'
      });
      console.css({
        'border-left-width': newWidth + 'px'
      });
    }
    return newWidth;
  });
}

function setUpTaskbar(editor) {
  var tasks = $('#tasks');

  tasks.change(function() {
    var current = $(this).data('current');
    var option = $('#tasks option:selected');
    var task = option.data('task');

    if (current) {
      localStorage[current.name] = editor.value;
    }

    if (task) {
      editor.value = localStorage[task.name] || task.code;
      $('#description').html(task.description);
      $(this).data('current', task);
    }
    else {
      $('#description').html('&nbsp;');
      $(this).data('current', null);
    }
    editor.focus = true;
  });

  $.getJSON('/tasks.js', function(sections) {
    tasks.empty();
    $('<option>Select a task</option>').appendTo(tasks);

    $(sections).each(function(i, section) {
      var sectionTag = $('<optgroup />').attr('label', section.name);
      $(section.tasks).each(function(j, task) {
        var taskTag = $('<option />').text(task.name);
        taskTag.data('task', task);
        taskTag.appendTo(sectionTag);
      });

      sectionTag.appendTo(tasks);
    });
  });
}

function setUpChangeLineNumber(editor) {
  $('#console .line').live('click', function() {
    var line = $(this).text().match(/(\d+)/)[0];
    editor.setLineNumber(parseInt(line));
  });
}

function updateLayout() {
  var taskbar = $('#taskbar');
  var editor = $('#editor');
  var console = $('#console');
  var lint = $('#lint');

  var height = window.innerHeight - taskbar.outerHeight() -
    console.outerHeight();
  var width = window.innerWidth;

  editor.css({
    height: height + 'px',
    width: width + 'px'
  });
}

function checkForLintErrors(code) {
  lintconsole.clear()
  var options = '/*jslint devel: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true */';
  var global = '/*global assert: true, iter: true */';

  if (!JSLINT(options + global + code)) {
    for (var i = 0; i < JSLINT.errors.length; i++) {
      var lint = JSLINT.errors[i];
        lintconsole.error(lint.id + ' ' + lint.reason, lint.line);
    }
  }
}
