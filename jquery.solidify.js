/**
 * User: rupin_t
 * Date: 7/22/13
 * Time: 11:00 AM
 */

(function ($) {
    var isCrawlable = navigator.userAgent == 'phantom.js';

    $.solidify = (function () {

        /**
         * Helper to permit compatibility with solidify.
         */
        Handlebars.registerHelper('solidify', function (url, options) {
            return '{{#solidify "' + url + '"}}' + options.fn(this) + '{{/solidify}}';
        });

        return function (rawTemplate) {
            if (!isCrawlable) {
                var inR = /\{\{#solidify .*\}\}/, outR = /\{\{\/solidify\}\}/;
                while (rawTemplate.match(inR) || rawTemplate.match(outR))
                    rawTemplate = rawTemplate.replace(inR, '').replace(outR, '');
                while (rawTemplate.indexOf('{ { {') !== -1 || rawTemplate.indexOf('} } }') !== -1)
                    rawTemplate = rawTemplate.replace('{ { {', '{{{').replace('} } }', '}}}');
                while (rawTemplate.indexOf('{ {') !== -1 || rawTemplate.indexOf('} }') !== -1)
                    rawTemplate = rawTemplate.replace('{ {', '{{').replace('} }', '}}');
            }
            return rawTemplate;
        };
    })();

})(jQuery);