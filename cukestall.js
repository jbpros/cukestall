var BACKDOOR_NAME_REGEXP = /[^\/]+$/;
var DEFAULT_MOUNT_ENDPOINT = '/cukestall';

var fs         = require('fs');
var path       = require('path');
var express    = require('express');
var browserify = require('browserify');
var Bundler    = require('cucumber/bundler');
//require('coffee-script');

var DEFAULT_MOUNT_ENDPOINT = "/cukestall";

var CukeStall = {
  runner: function runner(options) {
    options = options || {};
    options.backdoors = options.backdoors || {};
    options.mountEndPoint = options.mountEndPoint || DEFAULT_MOUNT_ENDPOINT;
    options.require = options.require || [];
    options.modules = options.modules || [];

    var bundler = Bundler();
    var serveStatic = express.static(__dirname + '/public');

    var serveCukeStall = function serveCukeStall(req, res, next) {
      if (req.path == options.mountEndPoint + '/javascripts/cucumber.js') {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(bundler.bundle());
      } else if (req.path == options.mountEndPoint + '/javascripts/cukestall.js') {
        res.setHeader('Content-Type', 'application/javascript');
        var supportCodeBundle = browserify();
        supportCodeBundle.prepend('(function(context) {\n');

        supportCodeBundle.addEntry('lib/kite.js', {dirname: __dirname+"/node_modules/kite", target: "/node_modules/kite"});
        supportCodeBundle.addEntry('lib/kite/driver/cukestall_driver.coffee', {dirname: __dirname+"/node_modules/kite", target: "/node_modules/kite/driver/cukestall_driver"});
        supportCodeBundle.append("context.Kite = require('kite');\n");
        supportCodeBundle.append("context.Kite.Driver.Cukestall = require('kite/driver/cukestall_driver');\n");

        options.modules.forEach(function(modulePath) {
          normalizedPath = path.normalize(modulePath);
          supportCodeBundle.addEntry(modulePath, {target: path.normalize(normalizedPath)});
        });

        supportCodeBundle.append("context.supportCode = function () {\n");
        options.require.forEach(function(requirePath) {
          normalizedPath = path.normalize(requirePath);
          supportCodeBundle.addEntry(requirePath, {target: path.normalize(normalizedPath)});
          supportCodeBundle.append("require('"+normalizedPath+"').call(this);");
        });
        supportCodeBundle.append("};\n");
        if (process.env.DEBUG_LEVEL)
          supportCodeBundle.append("context.cukestallRequire = require;\n");
        supportCodeBundle.append("})(window);");
        res.end(supportCodeBundle.bundle());
      } else if (req.url == options.mountEndPoint || req.url == options.mountEndPoint + '/') {
        var features = [];
        options.features.forEach(function (feature) {
          features.push(fs.readFileSync(feature));
        });
        res.render(__dirname + '/views/index.ejs', {features: features, layout: 'layouts/application'});
      } else if (req.url == options.mountEndPoint + '/blank') {
        res.render(__dirname + '/views/blank.ejs', {layout: 'layouts/application'});
      } else {
        var backdoorName = BACKDOOR_NAME_REGEXP.exec(req.url);
        if (backdoorName != null && options.backdoors[backdoorName]) {
          options.backdoors[backdoorName](req, res, next);
        } else {
          next();
        }
      }
    };

    return function (req, res, next) {
      serveStatic(req, res, function () {
        serveCukeStall(req, res, next);
      });
    };
  }
};

module.exports = CukeStall;
