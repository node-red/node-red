// A test node that exports a function
module.exports = function(RED) {
    function TestNode(n) {}
    RED.nodes.registerType("test-node-1",TestNode);
}
