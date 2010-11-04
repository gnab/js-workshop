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

  extendMethod(console, 'log', function(text) {
    appendToLog(log, text);
  });

  extendMethod(console, 'error', function(text) {
    appendToLog(log, '<span class="error">' + text + '</span>');
  });

  extendMethod(console, 'info', function(text) {
    appendToLog(log, '<span class="info">' + text + '</span>');
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

function appendToLog(log, text) {
  log[0].innerHTML = log[0].innerHTML + text + '<br />';
  log[0].scrollTop = log[0].scrollHeight;
}

function setUpEvaluation(editor) {
  $(document).keyup(function(e) {
    if (e.shiftKey && e.keyCode === 13) {
      if (e.ctrlKey) {
        console.clear();
      }
      var code = function() {
        try {
          /* CODE */
        } catch(err) {
          var line = ' '
          if (err.stack) {
            var match = err.stack.match(/.*:(\d+):(\d+)/);
            line += '(linje: ' + (match[1]-2) + ' tegn: ' + match[2] + ')';
          } else if (err.stacktrace) {
            var match = err.stacktrace(/.*line (\d+), column (\d+)/i);
            line += '(linje: ' + (match[1]-2) + ' tegn: ' + match[2] + ')';
          }
          console.error(err + line);
        }
      };
      var script = document.createElement("script");
      script.textContent = "(" + code.toString().replace('/* CODE */', editor.value) + ")();";
      document.body.appendChild(script);
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
