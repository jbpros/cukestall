var BACKDOOR_NAME_REGEXP = /[^\/]+$/;
var DEFAULT_MOUNT_ENDPOINT = '/cukestall';

var fs      = require('fs');
var express = require('express');

var CukeStall = {
  runner: function cukes(options) {
    options = options || {};

    var featurePaths     = options.featurePaths;
    var supportCodePaths = options.supportCodePaths;
    var stepDefsPaths    = options.stepDefsPaths;
    var backdoors        = options.backdoors || {};
    var mountEndpoint    = options.mountEndpoint || DEFAULT_MOUNT_ENDPOINT;

    var serveStatic      = express.static(__dirname + '/public')

    return function (req, res, next) {
      var serveCukeStall = function serveCukeStall() {
        if (req.url == mountEndpoint || req.url == mountEndpoint + '/') {
          var features = [];
          featurePaths.forEach(function (featurePath) {
            features.push(fs.readFileSync(featurePath));
          });
          res.render(__dirname + '/views/index.ejs', {features: features, layout: 'layouts/application'});
        } else if (req.url == mountEndpoint + '/blank') {
          res.render(__dirname + '/views/blank.ejs', {layout: 'layouts/application'});
        } else if (req.url == mountEndpoint + '/javascripts/stepdefs.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.write("window.supportCode = function () {\n");
          supportCodePaths.forEach(function (supportCodePath) {
            var supportCode = require(supportCodePath);
            res.write('(' + supportCode.toString() + ').apply(this);\n');
          });
          res.write("\n};\n");

          res.write("window.stepDefs = function () {\n");
          stepDefsPaths.forEach(function (stepDefsPath) {
            var stepDefs = require(stepDefsPath);
            res.write('(' + stepDefs.toString() + ').apply(this);\n');
          });
          res.end("\n};\n");
        } else {
          var backdoorName = BACKDOOR_NAME_REGEXP.exec(req.url);
          if (backdoorName != null && backdoors[backdoorName]) {
            backdoors[backdoorName](req, res, next);
          } else {
            next();
          }
        }
      };
      serveStatic(req, res, serveCukeStall);
    };
  }
};

module.exports = CukeStall;