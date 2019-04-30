// A test node that exports a function
module.exports = function(RED) {
    function DuffNode(n) {}
    RED.nodes.registerType("duff-node",DuffNode);
}
