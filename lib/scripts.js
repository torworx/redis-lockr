var fs = require('fs');
var Shavaluator = require('shavaluator');

exports.publish = function (client) {
    var lua = new Shavaluator(client);
    lua.add(load());
    return lua;
};

function load() {
    return {
        setnxpx: fs.readFileSync(__dirname + '/setnxpx.lua'),
        deleql: fs.readFileSync(__dirname + '/deleql.lua')
    };
}