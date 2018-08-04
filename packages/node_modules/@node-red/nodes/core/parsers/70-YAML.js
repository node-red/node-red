
module.exports = function(RED) {
    "use strict";
    var yaml = require('js-yaml');
    function YAMLNode(n) {
        RED.nodes.createNode(this,n);
        this.property = n.property||"payload";
        var node = this;
        this.on("input", function(msg) {
            var value = RED.util.getMessageProperty(msg,node.property);
            if (value !== undefined) {
                if (typeof value === "string") {
                    try {
                        value = yaml.load(value);
                        RED.util.setMessageProperty(msg,node.property,value);
                        node.send(msg);
                    }
                    catch(e) { node.error(e.message,msg); }
                }
                else if (typeof value === "object") {
                    if (!Buffer.isBuffer(value)) {
                        try {
                            value = yaml.dump(value);
                            RED.util.setMessageProperty(msg,node.property,value);
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
