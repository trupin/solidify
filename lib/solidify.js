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

var reqs;

var Solidify = module.exports = function (options) {
    this.options = options = _.isObject(options) ? options : {};
    options.host = _.isString(options.host) ? options.host : 'http://127.0.0.1:3000';
    options.logLevel = Solidify.logLevelEnums[options.logLevel || 'none'];

    this._id = utils.md5((+new Date()).toString());
};

Solidify.create = function (options) {
    return new Solidify(options);
};

Solidify.logLevelEnums = { none: 0, info: 1, debug: 2 };

Solidify.HandleBars = Handlebars;

Handlebars.registerHelper('solidify', function (method) {
    var m =
        method == 'get' ? method :
            method == 'post' ? method : null;

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
            _.map(urls,function (url) {
                return '"' + utils.md5(url) + '"';
            }).join(' ') + '}}' + options.fn(this) +
            '{{/__context__}}';
    return '';
});


Handlebars.registerHelper('__context__', function (field, options) {
    return options.fn(this[field] || {});
});

Solidify.prototype.compile = function (rawTemplate) {
    reqs = {};
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

var compileUrl = function (url, context) {
    var regex = /[&?]?\{(.*)\}/,
        body = {};

    var params = url.replace(/.*:\/\/.*\//, ''),
        host = url.replace(params, '');

    while (params.match(regex)) {
        params = params.replace(regex, function (__, s) {
            _.each(s.trim().split('&'), function (field) {
                if (field.indexOf(':') != 0)
                    return;
                field = field.substring(1);
                if (context[field])
                    body[field] = context[field];
            });
            return '';
        });
    }
    regex = /(:\w+)/;
    while (params.match(regex)) {
        params = params.replace(regex, function (__, param) {
            if (param && param.length > 1 && context[param.substring(1)])
                return param.substring(1) + '=' + context[param.substring(1)];
            return '';
        });
    }
    params = params.replace(/[?&]$/, '');
    while (params.indexOf('//') != -1)
        params = params.replace('//', '/');
    return { url: host + params, body: body };
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
            requests.push({ method: method, url: url});
        });
    });

    async.waterfall([
        function (next) {
            async.mapSeries(requests, function (req, done) {
                var url = req.url;
                if (url.indexOf('http://') != 0)
                    url = options.host + url;

                var o = compileUrl(url, options.context);
                that.log('info', 'Requesting: ' + o.url);

                o.url += (o.url.indexOf('?') == -1 ? '?' : '&') + that._id + '=true';
                if (options.sessionID)
                    o.url += '&sessionID=' + options.sessionID;
                req.method = req.method.toUpperCase();

                var opts = {
                    uri: o.url,
                    method: req.method
                };
                if (_.size(o.body))
                    opts.json = o.body;

                request(opts, function (error, response, body) {
                    if (error || response.statusCode != 200)
                        return done(error || new Error('Couldn\'t fetch the template context.'));
                    try {
                        if (_.isString(body))
                            body = JSON.parse(body);
                    } catch (e) {
                        console.log(e);
                    }
                    return done(null, {
                        cookies: _.uniq(response.headers['set-cookie']),
                        body: body.context,
                        session: body.session
                    });
                })
            }, next);
        },
        function (res, next) {
            var context = {}, cookies = [], session = {};
            for (var i = 0; i < res.length; ++i) {
                context[utils.md5(requests[i].url)] = res[i].body;
                cookies = cookies.concat(res[i].cookies);
                session = _.extend(session, res[i].session);
            }
            try {
                next(null, {
                    html: Handlebars.compile(options.template)(context),
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
        var sessionID = req.query.sessionID;
        req.query = _.omit(req.query, that._id, 'sessionID');

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
            send.call(res, {
                context: data,
                session: _.omit(req.session, 'cookie')
            });
        };

        req.sessionID = sessionID;
        req.sessionStore.load(sessionID, function (err, session) {
            if (session)
                req.session = session;
            next();
        });
    };
};