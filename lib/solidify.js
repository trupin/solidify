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
    url = require('url'),
    ent = require('ent');

var utils = require('./utils.js');

require('./helpers.js');

var Solidify = module.exports = function (options) {
    this.options = options = _.isObject(options) ? options : {};
    options.host = _.isString(options.host) ? options.host : 'http://127.0.0.1:3000';
    options.logLevel = Solidify.logLevelEnums[options.logLevel || 'none'];
    options.requester = _.isFunction(options.requester) ? options.requester : this.defaultRequester;

    this._id = utils.md5((+new Date()).toString());
};

Solidify.create = function (options) {
    return new Solidify(options);
};

Solidify.logLevelEnums = { none: 0, info: 1, error: 2, debug: 3 };

Solidify.HandleBars = Handlebars;

Solidify.prototype.compile = function (rawTemplate) {
    var reqs = {};

    Handlebars.registerHelper('solidify', function (method) {
        var m = ['get', 'post', 'delete', 'put'].indexOf(method) !== -1 ? method : null;

        var urls = _.toArray(arguments).slice(m ? 1 : 0),
            options = urls[urls.length - 1];
        urls = _.map(urls.slice(0, urls.length - 1), ent.decode);

        m = m || 'get';
        reqs[m] = reqs[m] || [];
        _.each(urls, function (url) {
            reqs[m].push(url);
        });
        reqs[m] = _.uniq(reqs[m]);

        if (options.fn)
            return '{{#__context__ ' +
                _.map(urls, function (url) {
                    return '"' + utils.md5(url) + '"';
                }).join(' ') + '}}' + options.fn(this) +
                '{{/__context__}}';
        return '';
    });

    rawTemplate.replace(/\{\{ *#?solidify-(\w+)[^\}]*\}\}/g, function (__, name) {
        Handlebars.registerHelper('solidify-' + name, function () {
            var options = arguments[arguments.length - 1],
                args = _.toArray(arguments).slice(0, arguments.length - 1).join(' '),
                isScope = _.isFunction(options.fn);
            return new Handlebars.SafeString('{{' + (isScope ? '#' : '') + name + ' ' + args + '}}' + (isScope ? options.fn(this) + '{{/' + name + '}}' : ''));
        });
        return '';
    });

    try {
        var template = Handlebars.compile(rawTemplate)();
    } catch (e) {
        this.log('error', e.message);
        return null;
    }

    template = template.replace(/((\{ )+\{|(\} )+\})/g, function (expr) {
        return expr.split(' ').join('');
    });

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

var compileUrl = function (url, context) {
    var body = {};

    var params = url.replace(/.*:\/\/.*\//, ''),
        host = url.replace(params, '');

    params = params.replace(/[&?]?\[(.*)\]/g, function (__, s) {
        _.each(s.trim().split('&'), function (field) {
            if (field.indexOf(':') != 0)
                return;
            field = field.substring(1);
            if (context[field])
                body[field] = context[field];
        });
        return '';
    });

    var pathname, query = '';
    if (params.indexOf('?')) {
        pathname = params.split('?')[0];
        query = params.split('?').slice(1).join('?');
    }
    else pathname = params;

    pathname = pathname.replace(/(:\w+)/g, function (__, param) {
        if (param && param.length > 1 && context[param.substring(1)])
            return context[param.substring(1)];
        return '';
    });
    query = query.replace(/(:\w+)/g, function (__, param) {
        if (param && param.length > 1 && context[param.substring(1)])
            return param.substring(1) + '=' + context[param.substring(1)];
        return '';
    });

    params = [pathname, query].join('?');
    params = params.replace(/[?&]$/, '');

    return { url: host + params, body: body };
};

Solidify.prototype.defaultRequester = function (options, callback) {
    request(options, function (error, response, body) {
        if (error || response.statusCode != 200)
            return callback(error || new Error('Couldn\'t fetch the template context.'));
        callback(null, response, body);
    });
};

Solidify.prototype.feed = function (options, callback) {
    var that = this;

    options.requests = _.isObject(options.requests) ? options.requests : {};
    options.template = _.isString(options.template) ? options.template : '';
    options.context = _.isObject(options.context) ? options.context : {};
    options.sessionID = _.isString(options.sessionID) ? options.sessionID : null;
    options.host = _.isString(options.host) ? options.host : this.options.host;

    var requests = [];
    _.each(options.requests, function (urls, method) {
        _.each(urls, function (url) {
            requests.push({ method: method, url: url });
        });
    });

    var session;
    async.waterfall([
        function (next) {
            async.map(requests, function (req, done) {
                var url = req.url,
                    isLastRequest = req == _.last(requests);
                if (url.indexOf('http://') != 0)
                    url = options.host + url;

                var o = compileUrl(url, options.context);
                that.log('info', 'Requesting: ' + o.url);

                o.url += (o.url.indexOf('?') == -1 ? '?' : '&') + that._id + '=true';

                // TODO make it unique
                if (options.sessionID)
                    o.url += '&sessionID=' + options.sessionID;

                if (isLastRequest)
                    o.url += '&lastRequest=true';

                req.method = req.method.toUpperCase();

                var opts = {
                    uri: o.url,
                    method: req.method
                };
                if (_.size(o.body))
                    opts.json = o.body;

                that.options.requester(opts, function (error, response, body) {
                    if (error) return done(error);
                    try {
                        if (_.isString(body))
                            body = JSON.parse(body);
                    } catch (e) {
                        console.log(e);
                    }
                    session = body.session || null;
                    return done(null, {
                        cookies: _.uniq(response.headers['set-cookie']),
                        body: body.context
                    });
                });
            }, next);
        },
        function (res, next) {
            var context = {}, cookies = [];

            Handlebars.registerHelper('__context__', function () {
                var fields = _.toArray(arguments).slice(0, arguments.length - 1),
                    c = {},
                    options = arguments[arguments.length - 1];
                _.each(fields, function (f) {
                    c = _.extend(c, context[f] || {});
                });
                return options.fn(c);
            });

            for (var i = 0; i < res.length; ++i) {
                context[utils.md5(requests[i].url)] = res[i].body;
                cookies = cookies.concat(res[i].cookies);
            }
            try {
                next(null, {
                    html: Handlebars.compile(options.template)(),
                    cookies: cookies,
                    session: session
                });
            } catch (e) {
                next(e);
            }
        }
    ], callback);
};

Solidify.prototype.express = function () {
    var that = this;
    return function (req, res, next) {
        if (!req.query[that._id])
            return next();

        var sessionID = req.query.sessionID,
            lastRequest = req.query.lastRequest;
        req.query = _.omit(req.query, that._id, 'sessionID', 'lastRequest');

        if (_.isString(req.body)) {
            try {
                req.body = JSON.parse(req.body);
            } catch (e) {
                return next();
            }
        }

        req.solidify = true;

        var send = res.send.bind(_.clone(res));
        res.send = function (data) {
            data = { context: data };
            if (lastRequest)
                data.session = _.omit(req.session, 'cookie');
            send.call(res, data);
        };

        req.sessionID = sessionID;
        req.sessionStore.load(sessionID, function (err, session) {
            if (session)
                req.session = session;
            next();
        });
    };
};