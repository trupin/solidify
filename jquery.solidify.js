/**
 * User: rupin_t
 * Date: 7/22/13
 * Time: 11:00 AM
 */

(function ($) {
    var isCrawlable = navigator.userAgent == 'crawlable'; // TODO make it dynamic

    $.solidify = function (rawTemplate) {
        if (!isCrawlable) {
            var regex = /\{\{ *[#/]?solidify(-\w+)?[^\}]*\}\}/;
            while (rawTemplate.match(regex))
                rawTemplate = rawTemplate.replace(regex, '');

            regex = /((\{ )+\{|(\} )+\})/;
            while (rawTemplate.match(regex))
                rawTemplate = rawTemplate.replace(regex, function (expr) {
                    return expr.split(' ').join('');
                });
        }
        else {
            var inR = /\{\{ *#?(solidify(-\w+)?)[^\}]*\}\}/, s = rawTemplate;
            while (s.match(inR)) {
                s = s.replace(inR, function (__, name) {
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
        }
        return Handlebars.compile(rawTemplate);
    };

    $.solidify.addons = {
        include: _.memoize(function (url) {
            var rawTemplate = '';

            $.ajax({ url: url, async: false })
                .done(function (data) {
                    rawTemplate = data;
                });

            return $.solidify(rawTemplate)();
        })
    };
})(jQuery);