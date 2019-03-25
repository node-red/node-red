
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
        this.on("input", function(msg) {
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
                    node.send(msg);
                }
                else if (typeof value == "string") {
                    options = {};
                    if (msg.hasOwnProperty("options") && typeof msg.options === "object") { options = msg.options; }
                    options.async = true;
                    options.attrkey = node.attrkey || options.attrkey || '$';
                    options.charkey = node.charkey || options.charkey || '_';
                    parseString(value, options, function (err, result) {
                        if (err) { node.error(err, msg); }
                        else {
                            value = result;
                            RED.util.setMessageProperty(msg,node.property,value);
                            node.send(msg);
                        }
                    });
                }
                else { node.warn(RED._("xml.errors.xml_js")); }
            }
            else { node.send(msg); } // If no property - just pass it on.
        });
    }
    RED.nodes.registerType("xml",XMLNode);
}
