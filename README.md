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

**Options:**
* `host`: a string specifying the host from where `Solidify` will fetch the dynamic data when necessary (default to `'http://127.0.0.1:3000'`).
* `logger`: a `winston` logger instance. Pass it if you want to configure the logger yourself.

`solidify.compile(rawTemplate);`: transform a string template into a compiled object.

`solidify.feed(options, compiledObject);`: feed an object compiled with `Solidify.compile` and return a string containing the final html.

**Options:**
* `requests`: an object containing the requests to do to fetch the dynamic data from the host (`{"pathname": "get|post|del|put"}`).
* `sessionID`: a string containing an identifier for the session. It will be passed in the requests `query` so the host is able to identify which
session to use.
* `template`: a string containing the compiled template.
* `context`: an object containing the initial data from which the final html will be rendered.

`solidify.express`: a `Connect`/`Express` middleware, automatically handling the sessionID.

## `jQuery` module description

`jQuery.solidify(rawTemplate);`: compile a string containing the `HandleBars` template and return a `HandleBars` compiled object.

## `HandleBars` extra syntax

As you may wonder, `Solidify` add some syntax to `HandleBars`.

* `{{solidify ["method"] "/my/api/route"}}` specifies a request to do when `Crawlable` will need some data to feed the template
(on the server side only).
* `{{solidify-include "/my/template/path"}}` specifies a template to include (on the server side only).
* `{{[#]solidify-helperName}}` calls an helper (on the server side only).
* `{ {[#]helperName} }` calls an helper (on the client and server side).
* `{ {fieldName} }` dereferences a field (on the client and server side).

Notice that every other `HandleBars` syntax are available, and all the syntax we saw which are used on the server side only
are completely ignored by `Solidify` on the client side, so it has no influence on your client side original templates.

## A quick example of a dynamic templating with `Solidify`

For this example, we imagine we want to render a list with [`Backbone.js`](http://backbonejs.org/).
We have a `Collection` and a `View`, rendering an `ItemView` for each `Model` of our `Collection`.

Here is the `Item` template:

``` html
<!-- specify the needed request to fetch the data -->
{{solidify "/api/items"}}
<!-- the same as {{#each}}, but for the server side rendering only (client will ignore it) -->
{{#solidify-each "this"}}
    <!-- dereference the field content, will be interpreted on the client and server side -->
    <li>{ {content} }</li>
{{/solidify-each}}
```

Now here is the `List` template:

``` html
<div>
     <h1>My list</h1>
     <div>
          <!-- Include a template. This is for the server side only, the client simply ignore it -->
          {{solidify-include "/templates/item.html"}}
     </div>
</div>
```

As you can see, we say to `Solidify` to fetch the `items` by doing a request to the host. Then, for each `item` we
dereference the content variable so it will be injected into each `li`.
Notice we include the `Item` template into the `List` template. This is for convenience when using some `Backbone.js` views.

## A more explicit example

If you want to see how it can be used in a project, please visit the `crawlable-todos` example
on [GitHub](https://github.com/trupin/crawlable-todos) or deployed on [Heroku](http://crawlable-todos.herokuapp.com/).
