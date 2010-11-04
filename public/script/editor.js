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
      try {
        eval('(function(){' + editor.value + '})()');
      } catch(err) {
        console.error(err);
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
    var code = option.data('code');

    if (code) {
      editor.value = code;
      $('#description').html('test');
    }

    editor.focus = true;
  });

  $.getJSON('/tasks.js', function(data) {
    tasks.empty();
    $('<option>Select a task</option>').appendTo(tasks);
    for (var sectionName in data) {
      if (data.hasOwnProperty(sectionName)) {
        var section = data[sectionName];

        var sectionOptions = $('<optgroup label="' + sectionName + 
          '"></optgroup>');

        for (var taskName in section) {
          if (section.hasOwnProperty(taskName)) {
            var task = section[taskName];
            var description = task['description'];
            var code = task['code'];

            var taskOption = $('<option>' + taskName + '</option>');
            taskOption.data('code', code); 
            taskOption.appendTo(sectionOptions);
          }
        }

        sectionOptions.appendTo(tasks);
      }
    }
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
