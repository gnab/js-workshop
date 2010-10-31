window.onBespinLoad = function() {
  bespin.useBespin('editor', {
    stealFocus: true,
    syntax: 'js',
    settings: {
      tabstop: 2,
      fontsize: 14,
      fontface: 'mono'
    }
  }).then(function(env) {
    setUpLog(env.editor);
    setUpEvaluation(env.editor);
    updateLayout();
  });
};

$(document).ready(function() {
  $(window).resize(updateLayout);
  updateLayout();
});

function setUpLog(editor) {
  var log = $('#log')[0];

  extendMethod(console, console.log, function(text) {
    appendToLog(log, text);
  });

  extendMethod(console, console.error, function(text) {
    appendToLog(log, '<span class="error">' + text + '</span>');
  });

  extendMethod(console, console.info, function(text) {
    appendToLog(log, '<span class="info">' + text + '</span>');
  });

  console.clear = function() {
    log.innerHTML = '';
    console.info('Press Shift + Enter to evaluate code ' +
      '(+ Control to clear log as well)');
  }

  console.clear();
}

function extendMethod(obj, method, extra) {
  obj[method.name] = function() {
    ret = undefined;
    if (method) {
      ret = method.apply(obj, arguments);
    }
    extra.apply(obj, arguments);
    return ret;
  }
}

function appendToLog(log, text) {
  log.innerHTML = log.innerHTML + text + '<br />';
  log.scrollTop = log.scrollHeight;
}

function setUpEvaluation(editor) {
  $(document).keyup(function(e) {
    if (e.shiftKey && e.keyCode === 13) {
      if (e.ctrlKey) {
        console.clear();
      }
      try {
        eval(editor.value);
      } catch(err) {
        console.error(err);
      }
    }
  });
}

function updateLayout() {
  var log = $('#log');
  var editor = $('#editor');

  var height = window.innerHeight - log.outerHeight();
  var width = window.innerWidth;

  editor.css({ 
    height: height + 'px', 
    width: width + 'px'  
  });
}
