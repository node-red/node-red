
module.exports = function(RED) {
    "use strict";
    var sentiment = require('sentiment');

    function SentimentNode(n) {
        RED.nodes.createNode(this,n);
        this.property = n.property||"payload";
        var node = this;

        this.on("input", function(msg) {
            var value = RED.util.getMessageProperty(msg,node.property);
            if (value !== undefined) {
                sentiment(value, msg.overrides || null, function (err, result) {
                    msg.sentiment = result;
                    node.send(msg);
                });
            }
            else { node.send(msg); } // If no matching property - just pass it on.
        });
    }
    RED.nodes.registerType("sentiment",SentimentNode);
}
