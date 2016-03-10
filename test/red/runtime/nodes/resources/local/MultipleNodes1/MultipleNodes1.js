// A test node that exports a function
module.exports = function(RED) {
    function TestNode1(n) {}
    RED.nodes.registerType("test-node-multiple-1a",TestNode1);
    function TestNode2(n) {}
    RED.nodes.registerType("test-node-multiple-1b",TestNode2);
}
