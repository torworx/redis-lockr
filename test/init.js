var redis = require('redis');
var _ = require('lodash');
var assert = require('chai').assert;
require('chai').Assertion.includeStack = true;

exports.assert = assert;

exports.connect = function (opts) {
    var config = _.assign({
        port: 6379,
        host: '127.0.0.1'
    }, opts);

    return redis.createClient(config.port, config.host, config.options);
};