
module.exports = function(RED) {
    "use strict";
    function RbeNode(n) {
        RED.nodes.createNode(this,n);
        this.func = n.func || "rbe";
        this.gap = n.gap || "0";
        this.start = n.start || '';
        this.inout = n.inout || "out";
        this.pc = false;
        if (this.gap.substr(-1) === "%") {
            this.pc = true;
            this.gap = parseFloat(this.gap);
        }
        this.g = this.gap;
        this.property = n.property || "payload";
        this.topi = n.topi || "topic";
        this.septopics = true;
        if (n.septopics !== undefined && n.septopics === false) {
            this.septopics = false;
        }

        var node = this;

        node.previous = {};
        this.on("input",function(msg) {
            var topic;
            try {
                topic = RED.util.getMessageProperty(msg,node.topi);
            }
            catch(e) { }
            if (msg.hasOwnProperty("reset")) {
                if (node.septopics && topic && (typeof topic === "string") && (topic !== "")) {
                    delete node.previous[msg.topic];
                }
                else { node.previous = {}; }
            }
            var value;
            try {
                value = RED.util.getMessageProperty(msg,node.property);
            }
            catch(e) { }
            if (value !== undefined) {
                var t = "_no_topic";
                if (node.septopics) { t = topic || t; }
                if ((this.func === "rbe") || (this.func === "rbei")) {
                    var doSend = (this.func !== "rbei") || (node.previous.hasOwnProperty(t)) || false;
                    if (typeof(value) === "object") {
                        if (typeof(node.previous[t]) !== "object") { node.previous[t] = {}; }
                        if (!RED.util.compareObjects(value, node.previous[t])) {
                            node.previous[t] = RED.util.cloneMessage(value);
                            if (doSend) { node.send(msg); }
                        }
                    }
                    else {
                        if (value !== node.previous[t]) {
                            node.previous[t] = RED.util.cloneMessage(value);
                            if (doSend) { node.send(msg); }
                        }
                    }
                }
                else {
                    var n = parseFloat(value);
                    if (!isNaN(n)) {
                        if ((typeof node.previous[t] === 'undefined') && (this.func === "narrowband" || this.func === "narrowbandEq")) {
                            if (node.start === '') { node.previous[t] = n; }
                            else { node.previous[t] = node.start; }
                        }
                        if (node.pc) { node.gap = Math.abs(node.previous[t] * node.g / 100) || 0; }
                        else { node.gap = Number(node.gap); }
                        if ((node.previous[t] === undefined) && (node.func === "narrowbandEq")) { node.previous[t] = n; }
                        if (node.previous[t] === undefined) { node.previous[t] = n - node.gap - 1; }
                        if (Math.abs(n - node.previous[t]) === node.gap) {
                            if ((this.func === "deadbandEq")||(this.func === "narrowband")) {
                                if (node.inout === "out") { node.previous[t] = n; }
                                node.send(msg);
                            }
                        }
                        else if (Math.abs(n - node.previous[t]) > node.gap) {
                            if (this.func === "deadband" || this.func === "deadbandEq") {
                                if (node.inout === "out") { node.previous[t] = n; }
                                node.send(msg);
                            }
                        }
                        else if (Math.abs(n - node.previous[t]) < node.gap) {
                            if ((this.func === "narrowband")||(this.func === "narrowbandEq")) {
                                if (node.inout === "out") { node.previous[t] = n; }
                                node.send(msg);
                            }
                        }
                        if (node.inout === "in") { node.previous[t] = n; }
                    }
                    else {
                        node.warn(RED._("rbe.warn.nonumber"));
                    }
                }
            } // ignore msg with no payload property.
        });
    }
    RED.nodes.registerType("rbe",RbeNode);
}
