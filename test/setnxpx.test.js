var h = require('./init');
var scripts = require('../lib/scripts');

var t = h.assert;

var client = h.connect();
var lua = scripts.publish(client);

describe('lua/setnxpx', function () {

    var ttl = 50;

    beforeEach(function (done) {
        client.flushdb(done);
    });


    describe("with key that hasn't been set yet", function() {
        it('returns 1 for keys the do not yet exist', function(done) {
            lua.setnxpx({
                keys: 'testKey',
                args: ['testValue', ttl]
            }, function(err, result) {
                t.equal(result, 1);
                done();
            });
        });
        it('sets the expiration correctly', function(done) {
            lua.setnxpx({
                keys: 'testKey',
                args: ['testValue', ttl]
            }, function() {
                client.pttl('testKey', function(err, result) {
                    t.ok(result > 0);
                    t.ok(result == ttl);
                    done();
                });
            });
        });
    });
    describe("with key that already exists", function() {
        beforeEach(function(done) {
            client.set('testKey', 'testValue', function() {
                done();
            });
        });
        it('does not set the key', function(done) {
            lua.setnxpx({
                keys: 'testKey',
                args: ['newValue', ttl]
            }, function(err, result) {
                t.equal(result, 0);
                done();
            });
        });
        it('does not set an expiration time', function(done) {
            client.pttl('testKey', function(err, result) {
                t.equal(result, -1);
                done();
            });
        });
    });
});