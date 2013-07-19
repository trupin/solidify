/**
 * User: rupin_t
 * Date: 7/17/13
 * Time: 11:58 AM
 */

var Handlebars = require('handlebars'),
    _ = require('underscore'),
    request = require('request'),
    crypto = require('crypto'),
    async = require('async'),
    url = require('url');

var utils = require('./utils.js');

var reqs;

var Solidify = module.exports = function (options) {
    this.options = options = _.isObject(options) ? options : {};
    options.host = _.isString(options.host) ? options.host : 'http://127.0.0.1:3000';
    options.logLevel = Solidify.logLevelEnums[options.logLevel || 'none'];
};

Solidify.create = function (options) {
    return new Solidify(options);
};

Solidify.logLevelEnums = { none: 0, info: 1, debug: 2 };

Solidify.HandleBars = Handlebars;

Handlebars.registerHelper('solidify', function (url, options) {
    if (reqs.indexOf(url) == -1)
        reqs.push(url);
    return '{{#__context__ "' + utils.md5(url) + '"}}' + options.fn(this) + '{{/__context__}}';
});

Handlebars.registerHelper('__context__', function (field, options) {
    return options.fn(this[field] || {});
});


Solidify.prototype.compile = function (rawTemplate) {
    reqs = [];
    var template = Handlebars.compile(rawTemplate)();
    while (rawTemplate.indexOf('{ { {') !== -1 || rawTemplate.indexOf('} } }') !== -1)
        rawTemplate = rawTemplate.replace('{ { {', '{{{').replace('} } }', '}}}');
    while (template.indexOf('{ {') !== -1 || template.indexOf('} }') !== -1)
        template = template.replace('{ {', '{{').replace('} }', '}}');
    return {
        template: template,
        requests: reqs
    };
};

Solidify.prototype.log = function (level, msg) {
    if (!Solidify.logLevelEnums[level] || Solidify.logLevelEnums[level] < this.options.logLevel)
        return;
    console.log('[Solidify][' + level + '] ', msg);
};

var compileUrl = function (u, context) {
    u = url.parse(u);
    return (u.protocol + '//' + u.host + replace(u.pathname || '', context) + '?' + replace(u.query || '', context))
        .replace(/[?/]$/, '');
};

var replace = function (str, context) {
    var regex = /(:\w+)/;
    while (str.match(regex)) {
        str = str.replace(regex, function (__, param) {
            if (param && param.length > 1 && context[param.substring(1)])
                return param.substring(1) + '=' + context[param.substring(1)];
            return '';
        });
    }
    while (str.indexOf('//') != -1)
        str = str.replace('//', '/');
    return str;
};

Solidify.prototype.feed = function (options, callback) {
    var that = this;

    options.requests = _.isArray(options.requests) ? options.requests : [];
    options.template = _.isString(options.template) ? options.template : '';
    options.context = _.isObject(options.context) ? options.context : {};
    options.host = _.isString(options.host) ? options.host : this.options.host;

    async.waterfall([
        function (next) {
            async.map(options.requests, function (url, done) {
                if (url.indexOf('http://') != 0)
                    url = options.host + url;
                url = compileUrl(url, options.context);
                that.log('info', 'Requesting: ' + url);
                request(url, function (error, response, body) {
                    if (error || response.statusCode != 200)
                        return done(error || new Error('Couldn\'t fetch the template context.'));
                    try {
                        done(null, JSON.parse(body));
                    } catch (e) {
                        done(e);
                    }
                })
            }, next);
        },
        function (res, next) {
            var context = {};
            for (var i = 0; i < res.length; ++i)
                context[utils.md5(options.requests[i])] = res[i];
            try {
                next(null, Handlebars.compile(options.template)(context));
            } catch (e) {
                next(e);
            }
        }
    ], callback);
};