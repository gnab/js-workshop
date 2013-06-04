!function(context) {

  function setUpEditor() {
    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/textmate');
    var jsMode = require('ace/mode/javascript').Mode;
    editor.getSession().setMode(new jsMode());

    editor.setShowPrintMargin(false);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setTabSize(2);
    editor.renderer.setPadding(10);

    editor.focus();

    $('.ace_gutter').css({
      background: 'transparent',
      color: '#999'
    });
    $('.ace_scroller').css({
      'overflow-x': 'auto',
    });
    $('.ace_sb').css({
      'overflow-y': 'auto',
    });

    return editor;
  }

  function setUpLog() {
    var log = $('#log .content');
    var lintlog = $('#lint .content');

    if (typeof(console) === 'undefined') {
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
      log.children().remove();
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
    if (typeof(obj) === 'undefined') {
      element.text('undefined');
    } else if (obj === null) {
      element.text('null');
    } else if (typeof(obj) != 'object') {
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
        "addGlobal: function(key, func) { window[key] = func }}"+
      "<\/script>"
    );

    var sandbox = window.sandbox;
    delete window.sandbox;

    for (var key in globals) {
      sandbox.addGlobal(key, globals[key]);
    }

    sandbox.evaluate = function (code) {
      frames[frames.length - 1].document.write("<script>"+code+"<\/script>");
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

      var started = new Date().getTime()
        , finished = null
        , value = editor.getSession().getValue();

      sandbox.evaluate(value);
      finished = new Date().getTime();

      console.info('Finished in ' + (finished - started) + 'ms');
      checkForLintErrors(value);
    });

    $('#reset').click(function() {
      var task = $('#tasks').data('current')
      if (task) {
        delete localStorage[task.name];
        editor.getSession().setValue(task.code);
      }
    });

    $(window).bind('beforeunload', function() {
      saveCurrentTask();
    });

    $(document).keydown(function(e) {
      if (e.ctrlKey && e.keyCode === 13) {
        if (e.shiftKey) {
          $('#clear').click();
        }
        $('#run').click();
        e.preventDefault();
      }
    });
  }

  function checkForLintErrors(code) {
    lintconsole.clear();
    var options = '/*jslint devel: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true */';
    var global = '/*global assert: true, iter: true, setTimeout: true, window: true */';

    if (!JSLINT(options + global + code)) {
      for (var i = 0; i < JSLINT.errors.length; i++) {
        var lint = JSLINT.errors[i];
          lintconsole.error(lint.id + ' ' + lint.reason, lint.line);
      }
    }
  }

  function saveCurrentTask() {
    var task = $('#tasks').data('current');
    if (task) {
      localStorage[task.name] = editor.getSession().getValue();
    }
  }

  function setUpTaskbar(editor) {
    var tasks = $('#tasks');

    tasks.chosen();

    tasks.change(function() {
      var option = $('#tasks option:selected');
      gotoTask(option);
    });

    function gotoTask (option) {
      var task = option.data('task');

      saveCurrentTask();

      if (task) {
        editor.getSession().setValue(localStorage[task.name] || task.code);
        $('#description').html(task.description);
        tasks.data('current', task);
      }
      else {
        $('#description').html('&nbsp;');
        tasks.data('current', null);
      }
      editor.focus();
      lintconsole.clear();
      console.clear();
    }

    $.getJSON('/tasks.js', function(sections) {
      tasks.empty();
      $('<option />').appendTo(tasks);

      $(sections).each(function(i, section) {
        var sectionTag = $('<optgroup />').attr('label', section.name);
        $(section.tasks).each(function(j, task) {
          var taskTag = $('<option />').text(task.name);
          if (task.name.match(/^\d\d\. (What|How|Who|Is)/)) {
            taskTag.text(taskTag.text() + '?');
          }
          taskTag.data('task', task);
          taskTag.appendTo(sectionTag);
        });

        sectionTag.appendTo(tasks);
      });

      navigateToTaskByHash();
      tasks.trigger("liszt:updated");
    });

    function navigateToTaskByHash() {
      var cap, sectionNo, taskNo, section, task;
      if (cap = /^#(\d+)\/(\d+)$/.exec(window.location.hash)) {
        sectionNo = parseInt(cap[1], 10);
        taskNo = parseInt(cap[2], 10);

        section = tasks.find('optgroup')[sectionNo - 1];
        task = section && $(section).find('option')[taskNo - 1];

        task && gotoTask($(task));
        $(task).attr('selected', 'selected');
      }
    }
  }

  function setUpChangeLineNumber(editor) {
    $('#sidebar .line').live('click', function() {
      var line = $(this).text().match(/(\d+)/)[0];
      editor.gotoLine(parseInt(line));
      editor.focus();
    });
  }

  var editor = setUpEditor();
  setUpLog();
  setUpEvaluation(editor);
  setUpTaskbar(editor);
  setUpChangeLineNumber(editor);

}(this);

var printLineNumber = function (trace, msg) {
  var regex = new RegExp('(?:@| {4}at )' + location.href + ':(\\d+)');
  var match = regex.exec(trace);
  if (match) {
    console.error('Assert on line ' + match[1] + ' failed' +
        (msg ? ': ' + msg : '.'));
  }
}

var assert = function (expr, msg) {
  if (expr !== true) {
    var trace = printStackTrace();
    printLineNumber(trace, msg);
  }
  else {
    console.log((msg ? msg + ': ' : '') + 'OK!');
  }
}

