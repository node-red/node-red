module.exports = function(RED) {
    "use strict";
    function JunctionNode(n) {
        RED.nodes.createNode(this,n);
        this.on("input",function(msg, send, done) {
            send(msg);
            done();
        });
    }

    RED.nodes.registerType("junction",JunctionNode);
}
