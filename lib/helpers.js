/**
 * User: rupin_t
 * Date: 7/31/13
 * Time: 3:33 PM
 */

var Handlebars = require('handlebars'),
    _ = require('underscore');

Handlebars.registerHelper('echo', function () {
    return new Handlebars.SafeString(_.toArray(arguments).slice(0, arguments.length - 1).join(' '));
});