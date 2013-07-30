/**
 * User: rupin_t
 * Date: 7/26/13
 * Time: 2:48 PM
 */

var Handlebars = require('handlebars'),
    _ = require('underscore');

//Handlebars.registerHelper('solidify', function () {
//    var args = _.toArray(arguments),
//        options = args[args.length - 1];
//    args = args.slice(0, args.length - 1);
//    return '{{#solidify ' + _.map(args, function (e) { return '"' + e + '"'; }).join(' ') + '}}' + options.fn(this) + '{{/solidify}}';
//});

var reqs = {};
Handlebars.registerHelper('solidify', function (method) {
    var m =
        method == 'get' ? method :
        method == 'post' ? method : null;

    var urls = _.toArray(arguments).slice(m ? 1 : 0),
        options = urls[urls.length - 1];
    urls = urls.slice(0, urls.length - 1);

    m = m || 'get';
    reqs[m] = reqs[m] || [];
    _.each(urls, function (url) { reqs[m].push(url); });
    reqs[m] = _.uniq(reqs[m]);

    if (options.fn)
        return '{{#__context__ ' +
            _.map(urls, function (url) { return '"' + url + '"'; }).join(' ') + '}}' + options.fn(this) +
            '{{/__context__}}';
    return '';
});

//console.log(Handlebars.compile('{{#solidify "post" "toto" "tata" "tutu"}}{{/solidify}}')());
console.log(Handlebars.compile(
    '{{#solidify "post" "1" "2" "3"}}' +
        '{{#solidify "get" "4"}}{{/solidify}}' +
        '{{solidify "get" "5"}}' +
        '{{/solidify}}'
)());
console.log(reqs);