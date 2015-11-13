// A test node that exports a function
module.exports = function(RED) {
    function TestNode(n) {}
    RED.nodes.registerType("should-not-load-3",TestNode);
}
