/**
 * User: rupin_t
 * Date: 7/19/13
 * Time: 3:39 PM
 */

var crypto = require('crypto'),
    url = require('url');

exports.md5 = function (data) {
    var shasum = crypto.createHash('md5');
    return shasum.update(data).digest('hex');
};