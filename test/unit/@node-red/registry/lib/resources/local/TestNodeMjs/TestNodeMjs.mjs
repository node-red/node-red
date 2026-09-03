// A test node that exports an ESM default function
export default function(RED) {
    function TestNode(n) {}
    RED.nodes.registerType("test-node-mjs",TestNode);
}
