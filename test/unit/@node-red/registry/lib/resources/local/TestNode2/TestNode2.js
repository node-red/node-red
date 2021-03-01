// A test node that exports a function which returns a resolving promise

module.exports = function(RED) {
    return new Promise(function(resolve,reject) {
        function TestNode(n) {}
        RED.nodes.registerType("test-node-2",TestNode);
        resolve();
    });
}
