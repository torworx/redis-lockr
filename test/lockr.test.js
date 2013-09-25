var h = require('./init');
var lockr = require('..');

var t = h.assert;

var client = h.connect();
var lock = lockr(client);

describe('lockr', function () {

    beforeEach(function (done) {
        client.flushdb(done);
    });

    describe('when locked', function () {

        beforeEach(function () {
            lock('foo', function (err, release) {});
        });

        it('should prevent other clients from acquiring the lock', function(done) {
            return lock('foo', function(err) {
                t.ok(err);
                return done();
            });
        });

        it('the retry count should equal the maximum number of retries', function(done) {
            var retries = 5;
            return lock('foo', {
                maxRetries: retries
            }, function(err) {
                t.ok(err);
                t.strictEqual(retries, err.retries);
                return done();
            });
        });
    });

    describe('when unlocked', function () {
        it('should allow other clients to acquire the lock after a release', function(done) {
            lock('foo', function(err, unlock) {
                t.notOk(err);
                unlock(function(err) {
                    t.notOk(err);
                    lock('foo', function(err, unlock) {
                        t.notOk(err);
                        t.strictEqual(unlock.retries, 0);
                        done();
                    });
                });
            });
        });
    });


    describe('when lock expired', function() {
        var firstLockLifetime = 50;

        beforeEach(function() {
            lock('foo', {
                lifetime: firstLockLifetime
            }, function(err, unlock) {});
        });

        it('should acquire the lock if the lifetime has elapsed', function(done) {
            setTimeout(function() {
                return lock('foo', function(err, unlock) {
                    t.notOk(err);
                    t.strictEqual(unlock.retries, 0);
                    return done();
                });
            }, firstLockLifetime + 10);
        });

        it('should resolve lock contention with only a single winner', function(done) {
            var contenders = 10;
            var successes = 0;
            var failures = 0;
            var finished = 0;
            var retryTimeout = 5;
            var lockOpts = {
                retryTimeout: retryTimeout,
                maxRetries: (firstLockLifetime / retryTimeout) + 2
            };
            for (var i = 0; i < contenders; i ++) {
                lock('foo', lockOpts, function(err, unlock) {
                    if (err) {
                        failures += 1;
                        t.equal(err.retries, lockOpts.maxRetries);
                    } else {
                        successes += 1;
                        t.ok(unlock.retries > 0);
                    }
                    finished += 1;
                    if (finished === contenders) {
                        t.strictEqual(successes, 1);
                        t.strictEqual(failures, contenders - 1);
                        done();
                    }
                });
            }
        });
    });

});


