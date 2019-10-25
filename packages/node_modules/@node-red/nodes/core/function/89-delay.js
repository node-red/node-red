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

//Simple node to introduce a pause into a flow
module.exports = function(RED) {
    "use strict";

    var MILLIS_TO_NANOS = 1000000;
    var SECONDS_TO_NANOS = 1000000000;

    function DelayNode(n) {
        RED.nodes.createNode(this,n);

        this.pauseType = n.pauseType;
        this.timeoutUnits = n.timeoutUnits;
        this.randomUnits = n.randomUnits;
        this.rateUnits = n.rateUnits;

        if (n.timeoutUnits === "milliseconds") {
            this.timeout = n.timeout;
        } else if (n.timeoutUnits === "minutes") {
            this.timeout = n.timeout * (60 * 1000);
        } else if (n.timeoutUnits === "hours") {
            this.timeout = n.timeout * (60 * 60 * 1000);
        } else if (n.timeoutUnits === "days") {
            this.timeout = n.timeout * (24 * 60 * 60 * 1000);
        } else {   // Default to seconds
            this.timeout = n.timeout * 1000;
        }

        if (n.rateUnits === "minute") {
            this.rate = (60 * 1000)/n.rate;
        } else if (n.rateUnits === "hour") {
            this.rate = (60 * 60 * 1000)/n.rate;
        } else if (n.rateUnits === "day") {
            this.rate = (24 * 60 * 60 * 1000)/n.rate;
        } else {  // Default to seconds
            this.rate = 1000/n.rate;
        }

        this.rate *= (n.nbRateUnits > 0 ? n.nbRateUnits : 1);

        if (n.randomUnits === "milliseconds") {
            this.randomFirst = n.randomFirst * 1;
            this.randomLast = n.randomLast * 1;
        } else if (n.randomUnits === "minutes") {
            this.randomFirst = n.randomFirst * (60 * 1000);
            this.randomLast = n.randomLast * (60 * 1000);
        } else if (n.randomUnits === "hours") {
            this.randomFirst = n.randomFirst * (60 * 60 * 1000);
            this.randomLast = n.randomLast * (60 * 60 * 1000);
        } else if (n.randomUnits === "days") {
            this.randomFirst = n.randomFirst * (24 * 60 * 60 * 1000);
            this.randomLast = n.randomLast * (24 * 60 * 60 * 1000);
        } else {  // Default to seconds
            this.randomFirst = n.randomFirst * 1000;
            this.randomLast = n.randomLast * 1000;
        }

        this.diff = this.randomLast - this.randomFirst;
        this.name = n.name;
        this.idList = [];
        this.buffer = [];
        this.intervalID = -1;
        this.randomID = -1;
        this.lastSent = null;
        this.drop = n.drop;
        var node = this;

        function ourTimeout(handler, delay) {
            var toutID = setTimeout(handler, delay);
            return {
                clear: function() { clearTimeout(toutID); },
                trigger: function() { clearTimeout(toutID); return handler(); }
            };
        }

        var clearDelayList = function(s) {
            for (var i=0; i<node.idList.length; i++ ) { node.idList[i].clear(); }
            node.idList = [];
            if (s) { node.status({text:"reset"}); }
            else { node.status({}); }
        }

        var flushDelayList = function() {
            var len = node.idList.length;
            for (var i=0; i<len; i++ ) { node.idList[0].trigger(); }
            node.idList = [];
            node.status({text:"flushed"});
        }

        node.reportDepth = function() {
            if (!node.busy) {
                node.busy = setTimeout(function() {
                    if (node.buffer.length > 0) { node.status({text:node.buffer.length}); }
                    else { node.status({}); }
                    node.busy = null;
                }, 500);
            }
        }

        if (node.pauseType === "delay") {
            node.on("input", function(msg) {
                if (msg.hasOwnProperty("flush")) { flushDelayList(); }
                else {
                    var id = ourTimeout(function() {
                        node.idList.splice(node.idList.indexOf(id),1);
                        if (node.idList.length === 0) { node.status({}); }
                        node.send(msg);
                    }, node.timeout);
                    node.idList.push(id);
                    if ((node.timeout > 1000) && (node.idList.length !== 0)) {
                        node.status({fill:"blue",shape:"dot",text:" "});
                    }
                    if (msg.hasOwnProperty("reset")) { clearDelayList(true); }
                }
            });
            node.on("close", function() { clearDelayList(); });
        }
        else if (node.pauseType === "delayv") {
            node.on("input", function(msg) {
                var delayvar = Number(node.timeout);
                if (msg.hasOwnProperty("delay") && !isNaN(parseFloat(msg.delay))) {
                    delayvar = parseFloat(msg.delay);
                }
                if (delayvar < 0) { delayvar = 0; }
                var id = ourTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    if (node.idList.length === 0) { node.status({}); }
                    node.send(msg);
                }, delayvar);
                node.idList.push(id);
                if ((delayvar >= 0) && (node.idList.length !== 0)) {
                    node.status({fill:"blue",shape:"dot",text:delayvar/1000+"s"});
                }
                if (msg.hasOwnProperty("reset")) { clearDelayList(true); }
                if (msg.hasOwnProperty("flush")) { flushDelayList(); }
            });
            node.on("close", function() { clearDelayList(); });
        }
        else if (node.pauseType === "rate") {
            node.on("input", function(msg) {
                if (msg.hasOwnProperty("reset")) {
                    if (node.intervalID !== -1 ) {
                        clearInterval(node.intervalID);
                        node.intervalID = -1;
                    }
                    node.buffer = [];
                    node.status({text:"reset"});
                    return;
                }
                if (!node.drop) {
                    var m = RED.util.cloneMessage(msg);
                    delete m.flush;
                    if (node.intervalID !== -1) {
                        node.buffer.push(m);
                        node.reportDepth();
                    }
                    else {
                        node.send(m);
                        node.reportDepth();
                        node.intervalID = setInterval(function() {
                            if (node.buffer.length === 0) {
                                clearInterval(node.intervalID);
                                node.intervalID = -1;
                            }
                            if (node.buffer.length > 0) {
                                node.send(node.buffer.shift());
                            }
                            node.reportDepth();
                        }, node.rate);
                    }
                    if (msg.hasOwnProperty("flush")) {
                        while (node.buffer.length > 0) {
                            node.send(node.buffer.shift());
                        }
                        node.status({});
                    }
                }
                else {
                    var timeSinceLast;
                    if (node.lastSent) {
                        timeSinceLast = process.hrtime(node.lastSent);
                    }
                    if (!node.lastSent) { // ensuring that we always send the first message
                        node.lastSent = process.hrtime();
                        node.send(msg);
                    }
                    else if ( ( (timeSinceLast[0] * SECONDS_TO_NANOS) + timeSinceLast[1] ) > (node.rate * MILLIS_TO_NANOS) ) {
                        node.lastSent = process.hrtime();
                        node.send(msg);
                    }
                }
            });
            node.on("close", function() {
                clearInterval(node.intervalID);
                clearTimeout(node.busy);
                node.buffer = [];
                node.status({});
            });
        }
        else if ((node.pauseType === "queue") || (node.pauseType === "timed")) {
            node.intervalID = setInterval(function() {
                if (node.pauseType === "queue") {
                    if (node.buffer.length > 0) {
                        node.send(node.buffer.shift()); // send the first on the queue
                    }
                }
                else {
                    while (node.buffer.length > 0) {    // send the whole queue
                        node.send(node.buffer.shift());
                    }
                }
                node.reportDepth();
            },node.rate);

            var hit;
            node.on("input", function(msg) {
                if (!msg.hasOwnProperty("topic")) { msg.topic = "_none_"; }
                hit = false;
                for (var b in node.buffer) { // check if already in queue
                    if (msg.topic === node.buffer[b].topic) {
                        node.buffer[b] = msg; // if so - replace existing entry
                        hit = true;
                        break;
                    }
                }
                if (!hit) {
                    node.buffer.push(msg); // if not add to end of queue
                    node.reportDepth();
                }
                if (msg.hasOwnProperty("reset")) {
                    node.buffer = [];
                    node.status({text:"reset"});
                }
                if (msg.hasOwnProperty("flush")) {
                    while (node.buffer.length > 0) {
                        node.send(node.buffer.shift());
                    }
                    node.status({});
                }
            });
            node.on("close", function() {
                clearInterval(node.intervalID);
                node.buffer = [];
                node.status({});
            });
        }
        else if (node.pauseType === "random") {
            node.on("input", function(msg) {
                var wait = node.randomFirst + (node.diff * Math.random());
                var id = ourTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    node.send(msg);
                    node.status({});
                }, wait);
                node.idList.push(id);
                if ((node.timeout >= 1000) && (node.idList.length !== 0)) {
                    node.status({fill:"blue",shape:"dot",text:parseInt(wait/10)/100+"s"});
                }
                if (msg.hasOwnProperty("reset")) { clearDelayList(true); }
                if (msg.hasOwnProperty("flush")) { flushDelayList(); }
            });
            node.on("close", function() { clearDelayList(); });
        }
    }
    RED.nodes.registerType("delay",DelayNode);
}
