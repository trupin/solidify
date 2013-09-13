# `Solidify`, the template engine for `Crawlable` !

`Solidify` is an [`HandleBars`](http://handlebarsjs.com/) extension for the [`Crawlable`](https://github.com/trupin/crawlable) module.

## Installation

Simply do a `npm install crawlable-solidify --save` at the root of your `Node.js` project.

On the client side, `Solidify` depends on `jQuery`, `underscore`, and of course `HandleBars`. So you may have to insert something like
below in your `index.html` file.

``` html
<script type="text/javascript" src="/jquery/jquery.js"></script>
<script type="text/javascript" src="/underscore/underscore.js"></script>
<script type="text/javascript" src="/handlebars/handlebars.js"></script>
<script type="text/javascript" src="/solidify/jquery.solidify.js"></script>
```

## How does it work ?

As you may know, `Crawlable` has some specific needs on the client and server side to work. That's why `Solidify`
also has two modules, one for `Node.js` and another for `jQuery`.

Here are the features `Solidify` handles:

* A specific client side template compilation in case the client has its `user-agent` set to a special value (`Crawlable` generates
its cache by requesting the routes with `PhantomJs` configured with this special `user-agent`).
* A specific server side template `feeder`. It interprets the `Solidify` compiled templates meta-data in order to fetch some dynamic
data before rendering it.

## `Node.js` module description

`Solidify.create(options);`: return an instance of a Solidify object.
** Options: **
* `host`: a string specifying the host from where `Solidify` will fetch the dynamic data when necessary (default to `'http://127.0.0.1:3000'`).
* `logger`: a `winston` logger instance. Pass it if you want to configure the logger yourself.

`solidify.compile(rawTemplate);`: transform a string template into a compiled object.

`solidify.feed(options, compiledObject);`: feed an object compiled with `Solidify.compile` and return a string containing the final html.
** Options: **
* `requests`: an object containing the requests to do to fetch the dynamic data from the host (`{"pathname": "get|post|del|put"}`).
* `sessionID`: a string containing an identifier for the session. It will be passed in the requests `query` so the host is able to identify which
session to use.
* `template`: a string containing the compiled template.
* `context`: an object containing the initial data from which the final html will be rendered.

`solidify.express`: a `Connect`/`Express` middleware, automatically handling the sessionID.

## `jQuery` module description

`jQuery.solidify(rawTemplate);`: compile a string containing the `HandleBars` template and return a `HandleBars` compiled object.

