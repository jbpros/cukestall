# CukeStall

**DISCLAIMER** This project is at its experimental stage. It's not tested and might be buggy.

A Cucumber.js runner for browsers Node.js middleware.

CukeStall lets you run a Cucumber feature suite against a Node.js web application right from your web browser.


## Usage

Plug CukeStall connect middleware into your app to serve it to the browser:

```javascript
var connect   = require('connect');
var CukeStall = require('cukestall');

var app = connect();
app.use(connect.logger('test'));
// your app code goes here ...

app.use(CukeStall.runner({
  featurePaths: [__dirname + '/features/my.feature'],
  stepDefsPaths: [__dirname + '/features/step_definitions/stepdefs.js'],
  supportCodePaths: [__dirname + '/features/support/cukestall.js']
}));

app.listen(1337);
```

Your application is now running normally at [localhost:1337](http://localhost:1337) and CukeStall is reachable on [localhost:1337/cukestall](http://localhost:1337/cukestall).

### Backdoors

It is common to perform "short-circuit" actions from within step definitions and hooks. For example, you might need to wipe out the whole database before every scenario. To do so, you can use backdoors.

Backdoors are routes added on top of your existing application.

```javascript
app.use(CukeStall.runner({
  featurePaths: [__dirname + '/features/my.feature'],
  stepDefsPaths: [__dirname + '/features/step_definitions/stepdefs.js'],
  supportCodePaths: [__dirname + '/features/support/cukestall.js']
  backdoors: {
    reset_all: function (req, res, next) {
      // this backdoor will allow a step definition on the browser side
      // to empty the database:
      MyDb.dropAll();
      res.end("DB emptied.");
    }
  }
}));
```

The backdoor can be triggered by POSTing to `localhost:1337/cukestall/reset_all`:

```javascript
// features/support/cukestall.js

this.Before(function (callback) {
  $.post('/cukestall/reset_all', null, function (results, textStatus, jqXHR) {
    callback();
  });
});
```
