/**
 * User: rupin_t
 * Date: 7/22/13
 * Time: 11:00 AM
 */

(function ($) {
    var isCrawlable = navigator.userAgent == 'crawlable'; // TODO make it dynamic

    $.solidify = function (rawTemplate) {
        if (!isCrawlable) {
            rawTemplate = rawTemplate
                .replace(/\{\{ *[#/]?solidify(-\w+)?[^\}]*\}\}/g, '')
                .replace(/((\{ )+\{|(\} )+\})/g, function (expr) {
                    return expr.split(' ').join('');
                });
        }
        else {
            rawTemplate.replace(/\{\{ *#?(solidify(-\w+)?)[^\}]*\}\}/g, function (__, name) {
                Handlebars.registerHelper(name, function () {
                    var n = name.replace('solidify-', '');
                    if (_.isFunction($.solidify.addons[n]))
                        return $.solidify.addons[n].apply(this, arguments);
                    var options = arguments[arguments.length - 1],
                        args = _.map(_.toArray(arguments).slice(0, arguments.length - 1),function (e) {
                            return '"' + e + '"';
                        }).join(' '),
                        isScope = _.isFunction(options.fn);
                    return '{{' + (isScope ? '#' : '') + name + ' ' + args + '}}' + (isScope ? options.fn(this) + '{{/' + name + '}}' : '');
                });
                return '';
            });
        }
        return Handlebars.compile(rawTemplate);
    };

    $.solidify.addons = {
        include: _.memoize(function (url) {
            var rawTemplate = '', $el;
            try {
                $el = $('#' + url);
            } catch (e) {
                $el = [];
            }
            if ($el.length)
                rawTemplate = $el.html();
            else
                $.ajax({ url: url, async: false })
                    .done(function (data) {
                        rawTemplate = data;
                    });
            return new Handlebars.SafeString($.solidify(rawTemplate)());
        }),
        html: function (html) {
            return new Handlebars.SafeString(html);
        }
    };
})(jQuery);