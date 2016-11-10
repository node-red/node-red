
module.exports = function(RED) {
    "use strict";
    var yaml = require('js-yaml');
    function YAMLNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                if (typeof msg.payload === "string") {
                    try {
                        msg.payload = yaml.load(msg.payload);
                        node.send(msg);
                    }
                    catch(e) { node.error(e.message,msg); }
                }
                else if (typeof msg.payload === "object") {
                    if (!Buffer.isBuffer(msg.payload)) {
                        try {
                            msg.payload = yaml.dump(msg.payload);
                            node.send(msg);
                        }
                        catch(e) {
                            node.error(RED._("yaml.errors.dropped-error"));
                        }
                    }
                    else { node.warn(RED._("yaml.errors.dropped-object")); }
                }
                else { node.warn(RED._("yaml.errors.dropped")); }
            }
            else { node.send(msg); } // If no payload - just pass it on.
        });
    }
    RED.nodes.registerType("yaml",YAMLNode);
};
