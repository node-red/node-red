
module.exports = function(RED) {
    "use strict";
    var xml2js = require('xml2js');
    var parseString = xml2js.parseString;

    function XMLNode(n) {
        RED.nodes.createNode(this,n);
        this.attrkey = n.attr;
        this.charkey = n.chr;
        this.property = n.property||"payload";
        var node = this;
        this.on("input", function(msg,send,done) {
            var value = RED.util.getMessageProperty(msg,node.property);
            if (value !== undefined) {
                var options;
                if (typeof value === "object") {
                    options = {renderOpts:{pretty:false}};
                    if (msg.hasOwnProperty("options") && typeof msg.options === "object") { options = msg.options; }
                    options.async = false;
                    var builder = new xml2js.Builder(options);
                    value = builder.buildObject(value, options);
                    RED.util.setMessageProperty(msg,node.property,value);
                    send(msg);
                    done();
                }
                else if (typeof value == "string") {
                    options = {};
                    if (msg.hasOwnProperty("options") && typeof msg.options === "object") { options = msg.options; }
                    options.async = true;
                    options.attrkey = node.attrkey || options.attrkey || '$';
                    options.charkey = node.charkey || options.charkey || '_';
                    parseString(value, options, function (err, result) {
                        if (err) { done(err); }
                        else {
                            RED.util.setMessageProperty(msg,node.property,result);
                            send(msg);
                            done();
                        }
                    });
                }
                else { node.warn(RED._("xml.errors.xml_js")); done(); }
            }
            else { send(msg); done(); } // If no property - just pass it on.
        });
    }
    RED.nodes.registerType("xml",XMLNode);
}
