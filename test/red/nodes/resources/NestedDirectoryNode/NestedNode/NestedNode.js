// A test node that exports a function
module.exports = function(RED) {
    function TestNode(n) {}
    RED.nodes.registerType("nested-node-1",TestNode);
}
