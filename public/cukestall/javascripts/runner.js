(function($) {
  var Selector = function Selector(context, string) {
    this.string = string;
    this.context = context;
  };

  Selector.prototype.apply = function apply() {
    // by link text:
    var $nodes = this._find("a:contains('" + this.string.replace("'", "\\'") + "')");
    if ($nodes.length > 0)
      return $nodes;

    // TODO: by button text

    // by CSS selector:
    $nodes = this._find(this.string);
    if ($nodes.length > 0)
      return $nodes;

    return [];
  };

  Selector.prototype._find = function _find(expandedSelector) {
    return this.context.contents().find(expandedSelector);
  };

  var FrameBrowser = function FrameBrowser(frameSelector) {
    var WAIT_FOR_TIMEOUT  = 5000;
    var WAIT_FOR_DELAY    = 20;
    var SAFETY_WAIT_DELAY = 20;

    var $frame = jQuery(frameSelector);
    window.f   = $frame;

    function _visitUri(uri) {
      $frame.get()[0].contentWindow.stop(); // stop possible current loads
      if ($frame.attr('src') == uri) {
        $frame.get()[0].contentWindow.location.reload();
      } else {
        $frame.attr('src', uri);
      }
    };

    var self = {
      toString: function () {
        return "#<CukestallBrowser frameSelector=\"" + frameSelector + "\" uri=\"" + $frame.attr('src') + "\">"
      },

      visitUri: function (uri, callback) {
        _visitUri(uri);
        callback();
      },

      click: function (selectorString, callback) {
        selector = self.createSelector(selectorString);
        // todo: allow for any kinds of selectors
        self.waitForSelector(selector, function (err, $elements) {
          if (err)
            return callback(err);
          $a = $($elements.get(0));
          var href = $a.attr('href');
          $a.click();
          if (href)
            _visitUri(href);
          callback();
        });
      },

      fill: function (selectorString, value, callback) {
        selector = self.createSelector(selectorString);
        self.waitForSelector(selector, function (err, $elements) {
          if (err)
            return callback(err);
          $elements.val(value);
          callback();
        });
      },

      getText: function (callback) {
        var text = $($frame.get()[0].contentDocument.body).text();
        callback(null, text);
      },

      createSelector: function (selector) {
        return new Selector($frame, selector);
      },

      waitForSelector: function (selector, callback) {
        var start = Date.now();
        check();

        function check() {
          var elapsed = Date.now() - start;
          var $nodes = selector.apply();
          if ($nodes.length > 0) {
            callback(null, $nodes);
          } else if (elapsed > WAIT_FOR_TIMEOUT) {
            callback(new Error("Timed out waiting for selector \"" + selector.string + "\" to appear in the DOM."));
          } else {
            setTimeout(check, WAIT_FOR_DELAY);
          }
        }
      }
    };
    return self;
  };

  var CucumberHTMLListener = function($root) {
    var CucumberHTML = window.CucumberHTML;
    var formatter    = new CucumberHTML.DOMFormatter($root);

    formatter.uri('report.feature');

    var currentStep;

    var self = {
      hear: function hear(event, callback) {
        var eventName = event.getName();
        switch (eventName) {
        case 'BeforeFeature':
          var feature = event.getPayloadItem('feature');
          formatter.feature({
            keyword     : feature.getKeyword(),
            name        : feature.getName(),
            line        : feature.getLine(),
            description : feature.getDescription()
          });
          break;

        case 'BeforeScenario':
          var scenario = event.getPayloadItem('scenario');
          formatter.scenario({
            keyword     : scenario.getKeyword(),
            name        : scenario.getName(),
            line        : scenario.getLine(),
            description : scenario.getDescription()
          });
          break;

        case 'BeforeStep':
          var step = event.getPayloadItem('step');
          self.handleAnyStep(step);
          break;

        case 'StepResult':
          var result;
          var stepResult = event.getPayloadItem('stepResult');
          if (stepResult.isSuccessful()) {
            result = {status: 'passed'};
          } else if (stepResult.isPending()) {
            result = {status: 'pending'};
          } else if (stepResult.isUndefined()) {
            result = {status: 'undefined'};
          } else if (stepResult.isSkipped()) {
            result = {status: 'skipped'};
          } else {
            var error = stepResult.getFailureException();
            var errorMessage = error.stack || error;
            result = {status: 'failed', error_message: errorMessage};
            displayError(error);
          }
          formatter.match({uri:'report.feature', step: {line: currentStep.getLine()}});
          formatter.result(result);
          break;

        case 'UndefinedStep':
        case 'SkippedStep':
          var step = event.getPayloadItem('step');
          self.handleAnyStep(step);
          formatter.match({uri:'report.feature', step: {line: step.getLine()}});
          formatter.result({status:'skipped'});
          break;
        }
        callback();
      },

      handleAnyStep: function handleAnyStep(step) {
        formatter.step({
          keyword     : step.getKeyword(),
          name        : step.getName(),
          line        : step.getLine(),
        });
        currentStep = step;
      }
    };
    return self;
  };

  window.CukeStall = { FrameBrowser: FrameBrowser };

  function runFeature() {
    var Cucumber        = window.Cucumber;
    var supportCode;
    var output          = $('#output');
    var featureSource   = $('script[type="text/x-gherkin"]').first().html();
    var supportCode     = function () { window.supportCode.call(this); };
    var cucumber        = Cucumber(featureSource, supportCode);
    var $output         = $('#output');
    var listener        = CucumberHTMLListener($output);
    $output.empty();
    cucumber.attachListener(listener);

    resetErrors();
    try {
      var oldHandler = window.onerror;
      window.onerror = function(err) {
        displayError(err);
        window.onerror = oldHandler;
      };
      cucumber.start(function() { });
    } catch(err) {
      displayError(err)
      throw err;
    };
  };

  function resetErrors() {
    var errors          = $('#errors');
    var errorsContainer = $('#errors-container');
    errors.text('');
    errorsContainer.hide();
  };

  function displayError(err) {
    var errors          = $('#errors');
    var errorsContainer = $('#errors-container');

    errorsContainer.show();
    var errMessage = err.stack || err.message || err;
    var buffer = (errors.text() == '' ? errMessage : errors.text() + "\n\n" + errMessage);
    errors.text(buffer);
  };

  $(function() {
    Gherkin = { Lexer: function() { return Lexer; } };
    $('#run').click(runFeature);
    $('#errors-container').hide();
  });
})(jQuery);
