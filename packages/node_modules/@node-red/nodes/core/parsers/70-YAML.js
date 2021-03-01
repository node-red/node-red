
module.exports = function(RED) {
    "use strict";
    var yaml = require('js-yaml');
    function YAMLNode(n) {
        RED.nodes.createNode(this,n);
        this.property = n.property||"payload";
        var node = this;
        this.on("input", function(msg,send,done) {
            var value = RED.util.getMessageProperty(msg,node.property);
            if (value !== undefined) {
                if (typeof value === "string") {
                    try {
                        value = yaml.load(value);
                        RED.util.setMessageProperty(msg,node.property,value);
                        send(msg);
                        done();
                    }
                    catch(e) { done(e.message); }
                }
                else if (typeof value === "object") {
                    if (!Buffer.isBuffer(value)) {
                        try {
                            value = yaml.dump(value);
                            RED.util.setMessageProperty(msg,node.property,value);
                            send(msg);
                            done();
                        }
                        catch(e) {
                            done(RED._("yaml.errors.dropped-error"));
                        }
                    }
                    else { node.warn(RED._("yaml.errors.dropped-object")); done(); }
                }
                else { node.warn(RED._("yaml.errors.dropped")); done(); }
            }
            else { send(msg); done(); } // If no payload - just pass it on.
        });
    }
    RED.nodes.registerType("yaml",YAMLNode);
};
