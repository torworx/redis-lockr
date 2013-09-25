var _ = require('lodash');
var uuid = require('node-uuid');
var scripts = require('./scripts');

module.exports = lockr;

/**
 *
 * @param client {object} The redis client
 * @param opts {object} Options:
 * - lifetime {number} Default expiration time
 * - retryDelay {number} Milliseconds to wait before re-attempting lock acquisition
 * - maxRetries {number} Number of times to re-attempt acquisition before issuing an error
 */
function lockr(client, opts) {
    var config = _.assign({}, {
        prefix: 'lock.',
        lifetime: 1000,
        retryDelay: 50,
        maxRetries: 0
    }, opts);

    var lua = scripts.publish(client);

    /**
     * This returns a lock function configured using the given options. Usage:
     *
     * @param key {string} key A string key to lock
     * @param lockOpts {object, optional} Options for overriding the base configuration.
     * @param callback {function} A callback representing a) an error handler, in case of
     *   a lock acquisition error, and b) the critical section. This callback
     *   should itself receive three parameters:
     *     1. An error object, in case there is lock acquisition error. This will
     *        be null if the lock is acquired successfully.
     *     2. A number representing the number of times lock acquisition was
     *        *retried*. Useful for determining if there was any contention. This
     *        is passed to the callback whether lock acquisition succeeded or not.
     *     3. An unlocking callback that signals the end of the critical section.
     *        This will be null if the lock was not acquired successfully.
     *        Optionally, you can pass a callback parameter when invoking the
     *        unlock callback to handle any Redis errors involved in the actual
     *        unlock. This final callback takes two parameters, an error and a
     *        true/false value, indicating whether the lock was actually removed
     *        from Redis. A false value implies that the lock had expired.
     */
    return function (key, lockOpts, callback) {
        if (typeof lockOpts === "function") {
            callback = lockOpts;
            lockOpts = config;
        } else {
            lockOpts = _.assign({}, config, lockOpts);
        }

        if (typeof callback !== "function") throw new TypeError('callback is required');
        key = lockOpts.prefix + key;

        var retries = 0;
        var lockValue = uuid.v1();

        var setnxpx_args = {
            keys: key,
            args: [lockValue, lockOpts.lifetime]
        };
        var deleql_args = {
            keys: key,
            args: lockValue
        };

        function attemptAcquire() {
            lua.setnxpx(setnxpx_args, function (err, result) {
                if (err) {
                    // I. Redis error
                    callback(error(err, {retries: retries}));
                } else if (result == 0) {
                    // II. The lock exists and has not yet expired. Attempt to retry.
                    if (retries >= lockOpts.maxRetries) {
                        callback(error('Exceeded max retry count', {retries: retries}));
                    } else {
                        retries++;
                        setTimeout(attemptAcquire, lockOpts.retryDelay);
                    }
                } else {
                    // III. Lock acquired! Proceed with the critical section.
                    unlock.retries = retries;
                    callback(null, unlock);
                }
            });
        }

        function unlock(unlockCallback) {
            // To unlock, run an atomic check + delete. Only delete the lock key
            // if the stored value is equal to this lock's expiration time.
            lua.deleql(deleql_args, function (err, result) {
                if (unlockCallback) unlockCallback(err, result == 1);
            });
        }

        attemptAcquire();
    }
}

function error(msg, config) {
    var err = msg instanceof Error ? msg : new Error(msg);
    if (config) _.assign(err, config);
    return err;
}