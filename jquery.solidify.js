/**
 * User: rupin_t
 * Date: 7/22/13
 * Time: 11:00 AM
 */

(function ($) {
    var isCrawlable = navigator.userAgent == 'crawlable'; // TODO make it dynamic

//    Handlebars.registerHelper('solidify', function (url, options) {
//        return '{{#solidify "' + url + '"}}' + options.fn(this) + '{{/solidify}}';
//    });

    Handlebars.registerHelper('solidify', function () {
        var urls = _.toArray(arguments),
            options = urls[urls.length - 1];

        urls = urls.slice(0, urls.length - 1);

        if (options.fn)
            return '{{#solidify ' + _.map(urls, function (url) {
                return '"' + url + '"';
            }).join(' ') + '}}' + options.fn(this) + '{{/solidify}}';

        return '{{solidify ' + _.map(urls, function (url) {
            return '"' + url + '"';
        }).join(' ') + '}}'
    });

    $.solidify = function (rawTemplate) {
        if (!isCrawlable) {
            var inR = /\{\{#?solidify .*\}\}/, outR = /\{\{\/solidify\}\}/;

            while (rawTemplate.match(inR) || rawTemplate.match(outR))
                rawTemplate = rawTemplate.replace(inR, '').replace(outR, '');
            while (rawTemplate.indexOf('{ { {') !== -1 || rawTemplate.indexOf('} } }') !== -1)
                rawTemplate = rawTemplate.replace('{ { {', '{{{').replace('} } }', '}}}');
            while (rawTemplate.indexOf('{ {') !== -1 || rawTemplate.indexOf('} }') !== -1)
                rawTemplate = rawTemplate.replace('{ {', '{{').replace('} }', '}}');
        }
        return rawTemplate;
    };
})(jQuery);