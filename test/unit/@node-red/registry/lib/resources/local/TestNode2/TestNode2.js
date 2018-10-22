// A test node that exports a function which returns a resolving promise

var when = require("when");
module.exports = function(RED) {
    return when.promise(function(resolve,reject) {
        function TestNode(n) {}
        RED.nodes.registerType("test-node-2",TestNode);
        resolve();
    });
}
