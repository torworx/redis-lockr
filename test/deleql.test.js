var h = require('./init');
var scripts = require('../lib/scripts');

var t = h.assert;

var client = h.connect();
var lua = scripts.publish(client);

describe('lua/setnxpx', function () {

    beforeEach(function (done) {
        client.flushdb(function () {
            client.set('testKey', 'matchThis', done);
        });
    });

    function deleql(value, callback) {
        if (typeof value === "function") {
            callback = value;
            value = "matchThis";
        }
        lua.deleql({
            keys: 'testKey',
            args: value
        }, function(err, result) {
            callback(err, result);
        });
    }
    
    it('returns zero if the key does not exist', function(done) {
        lua.deleql({
            keys: 'nonexistent',
            args: '1'
        }, function(err, result) {
            t.notOk(err);
            t.equal(result, 0);
            done();
        });
    });

    describe('when using a matching argument value', function() {

        it('should 1', function(done) {
            deleql(function(err, result) {
                t.notOk(err);
                t.equal(result, 1);
                done();
            });
        });

        it('should remove the key', function(done) {
            deleql(function() {
                client.get('testKey', function(err, result) {
                    t.notOk(err);
                    t.notOk(result);
                    done();
                });
            });
        });
    });
    describe('when using a non-matching argument value', function() {

        it('should 0', function(done) {
            deleql('doesNotMatch', function(err, result) {
                t.notOk(err);
                t.equal(result, 0);
                done();
            });
        });

        it('should not remove the key', function(done) {
            deleql('doesNotMatch', function() {
                client.get('testKey', function(err, result) {
                    t.notOk(err);
                    t.equal(result, 'matchThis');
                    done();
                });
            });
        });
    });
});