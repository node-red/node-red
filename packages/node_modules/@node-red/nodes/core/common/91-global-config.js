module.exports = function(RED) {
    "use strict";
    function GlobalConfigNode(n) {
        RED.nodes.createNode(this,n);
    }
    RED.nodes.registerType("global-config", GlobalConfigNode);
}
