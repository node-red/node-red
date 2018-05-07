/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    function TriggerNode(n) {
        RED.nodes.createNode(this,n);
        this.bytopic = n.bytopic || "all";
        this.op1 = n.op1 || "1";
        this.op2 = n.op2 || "0";
        this.op1type = n.op1type || "str";
        this.op2type = n.op2type || "str";

        if (this.op1type === 'val') {
            if (this.op1 === 'true' || this.op1 === 'false') {
                this.op1type = 'bool'
            } else if (this.op1 === 'null') {
                this.op1type = 'null';
                this.op1 = null;
            } else {
                this.op1type = 'str';
            }
        }
        if (this.op2type === 'val') {
            if (this.op2 === 'true' || this.op2 === 'false') {
                this.op2type = 'bool'
            } else if (this.op2 === 'null') {
                this.op2type = 'null';
                this.op2 = null;
            } else {
                this.op2type = 'str';
            }
        }
        this.extend = n.extend || "false";
        this.units = n.units || "ms";
        this.reset = n.reset || '';
        this.duration = parseFloat(n.duration);
        if (isNaN(this.duration)) {
            this.duration = 250;
        }
        if (this.duration < 0) {
            this.loop = true;
            this.duration = this.duration * -1;
            this.extend = false;
        }

        if (this.units == "s") { this.duration = this.duration * 1000; }
        if (this.units == "min") { this.duration = this.duration * 1000 * 60; }
        if (this.units == "hr") { this.duration = this.duration * 1000 *60 * 60; }

        this.op1Templated = (this.op1type === 'str' && this.op1.indexOf("{{") != -1);
        this.op2Templated = (this.op2type === 'str' && this.op2.indexOf("{{") != -1);
        if ((this.op1type === "num") && (!isNaN(this.op1))) { this.op1 = Number(this.op1); }
        if ((this.op2type === "num") && (!isNaN(this.op2))) { this.op2 = Number(this.op2); }
        //if (this.op1 == "null") { this.op1 = null; }
        //if (this.op2 == "null") { this.op2 = null; }
        //try { this.op1 = JSON.parse(this.op1); }
        //catch(e) { this.op1 = this.op1; }
        //try { this.op2 = JSON.parse(this.op2); }
        //catch(e) { this.op2 = this.op2; }

        var node = this;
        node.topics = {};

        this.on("input", function(msg) {
            var topic = msg.topic || "_none";
            if (node.bytopic === "all") { topic = "_none"; }
            node.topics[topic] = node.topics[topic] || {};
            if (msg.hasOwnProperty("reset") || ((node.reset !== '') && msg.hasOwnProperty("payload") && (msg.payload !== null) && msg.payload.toString && (msg.payload.toString() == node.reset)) ) {
                if (node.loop === true) { clearInterval(node.topics[topic].tout); }
                else { clearTimeout(node.topics[topic].tout); }
                delete node.topics[topic];
                node.status({});
            }
            else {
                if (((!node.topics[topic].tout) && (node.topics[topic].tout !== 0)) || (node.loop === true)) {
                    if (node.op2type === "pay" || node.op2type === "payl") { node.topics[topic].m2 = RED.util.cloneMessage(msg.payload); }
                    else if (node.op2Templated) { node.topics[topic].m2 = mustache.render(node.op2,msg); }
                    else if (node.op2type !== "nul") {
                        node.topics[topic].m2 = RED.util.evaluateNodeProperty(node.op2,node.op2type,node,msg);
                    }

                    if (node.op1type === "pay") { }
                    else if (node.op1Templated) { msg.payload = mustache.render(node.op1,msg); }
                    else if (node.op1type !== "nul") {
                        msg.payload = RED.util.evaluateNodeProperty(node.op1,node.op1type,node,msg);
                    }

                    if (node.duration === 0) { node.topics[topic].tout = 0; }
                    else if (node.loop === true) {
                        /* istanbul ignore else  */
                        if (node.topics[topic].tout) { clearInterval(node.topics[topic].tout); }
                        /* istanbul ignore else  */
                        if (node.op1type !== "nul") {
                            var msg2 = RED.util.cloneMessage(msg);
                            node.topics[topic].tout = setInterval(function() { node.send(RED.util.cloneMessage(msg2)); }, node.duration);
                        }
                    }
                    else {
                        if (!node.topics[topic].tout) {
                            node.topics[topic].tout = setTimeout(function() {
                                var msg2 = null;
                                if (node.op2type !== "nul") {
                                    msg2 = RED.util.cloneMessage(msg);
                                    if (node.op2type === "flow" || node.op2type === "global") {
                                        node.topics[topic].m2 = RED.util.evaluateNodeProperty(node.op2,node.op2type,node,msg);
                                    }
                                    msg2.payload = node.topics[topic].m2;
                                    delete node.topics[topic];
                                    node.send(msg2);
                                }
                                else { delete node.topics[topic]; }
                                node.status({});
                            }, node.duration);
                        }
                    }
                    node.status({fill:"blue",shape:"dot",text:" "});
                    if (node.op1type !== "nul") { node.send(RED.util.cloneMessage(msg)); }
                }
                else if ((node.extend === "true" || node.extend === true) && (node.duration > 0)) {
                    /* istanbul ignore else  */
                    if (node.op2type === "payl") { node.topics[topic].m2 = RED.util.cloneMessage(msg.payload); }
                    /* istanbul ignore else  */
                    if (node.topics[topic].tout) { clearTimeout(node.topics[topic].tout); }
                    node.topics[topic].tout = setTimeout(function() {
                        var msg2 = null;
                        if (node.op2type !== "nul") {
                            if (node.op2type === "flow" || node.op2type === "global") {
                                node.topics[topic].m2 = RED.util.evaluateNodeProperty(node.op2,node.op2type,node,msg);
                            }
                            if (node.topics[topic] !== undefined) {
                                msg2 = RED.util.cloneMessage(msg);
                                msg2.payload = node.topics[topic].m2;
                            }
                        }
                        delete node.topics[topic];
                        node.status({});
                        node.send(msg2);
                    }, node.duration);
                }
                else {
                    if (node.op2type === "payl") { node.topics[topic].m2 = RED.util.cloneMessage(msg.payload); }
                }
            }
        });
        this.on("close", function() {
            for (var t in node.topics) {
                /* istanbul ignore else  */
                if (node.topics[t]) {
                    if (node.loop === true) { clearInterval(node.topics[t].tout); }
                    else { clearTimeout(node.topics[t].tout); }
                    delete node.topics[t];
                }
            }
            node.status({});
        });
    }
    RED.nodes.registerType("trigger",TriggerNode);
}
