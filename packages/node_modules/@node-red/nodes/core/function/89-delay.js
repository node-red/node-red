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
    var _maxKeptMsgsCount;

    function maxKeptMsgsCount(node) {
        if (_maxKeptMsgsCount === undefined) {
            var name = "nodeMessageBufferMaxLength";
            if (RED.settings.hasOwnProperty(name)) {
                _maxKeptMsgsCount = RED.settings[name];
            }
            else {
                _maxKeptMsgsCount = 0;
            }
        }
        return _maxKeptMsgsCount;
    }

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
        this.droppedMsgs = 0;
        this.allowrate = n.allowrate|| false;
        this.fixedrate = this.rate;
        this.outputs = n.outputs;
        var node = this;

        function ourTimeout(handler, delay, clearHandler) {
            var toutID = setTimeout(handler, delay);
            return {
                clear: function() { clearTimeout(toutID); clearHandler(); },
                trigger: function() { clearTimeout(toutID); return handler(); }
            };
        }

        var sendMsgFromBuffer = function() {
            if (node.buffer.length === 0) {
                clearInterval(node.intervalID);
                node.intervalID = -1;
            }
            if (node.buffer.length > 0) {
                const msgInfo = node.buffer.shift();
                if (Object.keys(msgInfo.msg).length > 1) {
                    msgInfo.send(msgInfo.msg);
                    msgInfo.done();
                }
            }
            node.reportDepth();
        }

        var clearDelayList = function(s) {
            var len = node.idList.length;
            for (var i=0; i<len; i++ ) { node.idList[i].clear(); }
            node.idList = [];
            if (s) { node.status({fill:"blue",shape:"ring",text:0}); }
            else { node.status({}); }
        }

        var flushDelayList = function(n) {
            var len = node.idList.length;
            if (typeof(n) == 'number') { len = Math.min(Math.floor(n),len); }
            for (var i=0; i<len; i++ ) { node.idList[0].trigger(); }
            node.status({fill:"blue",shape:"dot",text:node.idList.length});
        }

        node.reportDepth = function() {
            if (!node.busy) {
                node.busy = setTimeout(function() {
                    // if (node.buffer.length > 0) { node.status({text:node.buffer.length}); }
                    // else { node.status({}); }
                    node.status({fill:"blue",shape:"dot",text:node.buffer.length});
                    node.busy = null;
                }, 500);
            }
        }

        var loggerId = setInterval(function () {
            if (node.droppedMsgs !== 0) {
                node.debug("node.droppedMsgs = " + node.droppedMsgs);
                node.droppedMsgs = 0;
            }
        }, 15 * 1000);
        node.on("close", function() { clearInterval(loggerId); });

        // The delay type modes
        if (node.pauseType === "delay") {
            node.on("input", function(msg, send, done) {
                var id = ourTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    if (node.timeout > 1000) {
                        node.status({fill:"blue",shape:"dot",text:node.idList.length});
                    }
                    send(msg);
                    done();
                }, node.timeout, () => done());
                if (Object.keys(msg).length === 2 && msg.hasOwnProperty("flush")) { id.clear(); }
                else { node.idList.push(id); }
                if (msg.hasOwnProperty("reset")) { clearDelayList(true); }
                else if (msg.hasOwnProperty("flush")) { flushDelayList(msg.flush); done(); }
                else if (node.timeout > 1000) {
                    node.status({fill:"blue",shape:"dot",text:node.idList.length});
                }
            });
            node.on("close", function() { clearDelayList(); });
        }
        else if (node.pauseType === "delayv") {
            node.on("input", function(msg, send, done) {
                var delayvar = Number(node.timeout);
                if (msg.hasOwnProperty("delay") && !isNaN(parseFloat(msg.delay))) {
                    delayvar = parseFloat(msg.delay);
                }
                if (delayvar < 0) { delayvar = 0; }
                var id = ourTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    if (node.idList.length === 0) { node.status({}); }
                    send(msg);
                    if (delayvar >= 0) {
                        node.status({fill:"blue",shape:"dot",text:node.idList.length});
                    }
                    done();
                }, delayvar, () => done());
                node.idList.push(id);
                if (msg.hasOwnProperty("reset")) { clearDelayList(true); }
                if (msg.hasOwnProperty("flush")) { flushDelayList(msg.flush); done(); }
                if (delayvar >= 0) {
                    node.status({fill:"blue",shape:"dot",text:node.idList.length});
                }
            });
            node.on("close", function() { clearDelayList(); });
        }

        else if (node.pauseType === "random") {
            node.on("input", function(msg, send, done) {
                var wait = node.randomFirst + (node.diff * Math.random());
                var id = ourTimeout(function() {
                    node.idList.splice(node.idList.indexOf(id),1);
                    send(msg);
                    if (node.timeout >= 1000) {
                        node.status({fill:"blue",shape:"dot",text:node.idList.length});
                    }
                    done();
                }, wait, () => done());
                if (Object.keys(msg).length === 2 && msg.hasOwnProperty("flush")) { id.clear(); }
                else { node.idList.push(id); }
                if (msg.hasOwnProperty("reset")) { clearDelayList(true); }
                if (msg.hasOwnProperty("flush")) { flushDelayList(msg.flush); done(); }
                if (node.timeout >= 1000) {
                    node.status({fill:"blue",shape:"dot",text:node.idList.length});
                }
            });
            node.on("close", function() { clearDelayList(); });
        }

        // The rate limit/queue type modes
        else if (node.pauseType === "rate") {
            node.on("input", function(msg, send, done) {
                if (!node.drop) {
                    var m = RED.util.cloneMessage(msg);
                    delete m.flush;
                    if (Object.keys(m).length > 1) {
                        if (node.intervalID !== -1) {
                            if (node.allowrate && m.hasOwnProperty("rate") && !isNaN(parseFloat(m.rate)) && node.rate !== m.rate) {
                                node.rate = m.rate;
                                clearInterval(node.intervalID);
                                node.intervalID = setInterval(sendMsgFromBuffer, node.rate);
                            }
                            var max_msgs = maxKeptMsgsCount(node);
                            if ((max_msgs > 0) && (node.buffer.length >= max_msgs)) {
                                node.buffer = [];
                                node.error(RED._("delay.errors.too-many"), m);
                            } else if (msg.toFront === true) {
                                node.buffer.unshift({msg: m, send: send, done: done});
                                node.reportDepth();
                            } else {
                                node.buffer.push({msg: m, send: send, done: done});
                                node.reportDepth();
                            }
                        }
                        else {
                            if (node.allowrate && m.hasOwnProperty("rate") && !isNaN(parseFloat(m.rate))) {
                                node.rate = m.rate;
                            }
                            send(m);
                            node.reportDepth();
                            node.intervalID = setInterval(sendMsgFromBuffer, node.rate);
                            done();
                        }
                    }
                    if (msg.hasOwnProperty("flush")) {
                        var len = node.buffer.length;
                        if (typeof(msg.flush) == 'number') { len = Math.min(Math.floor(msg.flush),len); }
                        if (len === 0) {
                            clearInterval(node.intervalID);
                            node.intervalID = -1;
                        }
                        else {
                            while (len > 0) {
                                const msgInfo = node.buffer.shift();
                                delete msgInfo.msg.flush;
                                delete msgInfo.msg.reset;
                                if (Object.keys(msgInfo.msg).length > 1) {
                                    node.send(msgInfo.msg);
                                    msgInfo.done();
                                }
                                len = len - 1;
                            }
                            clearInterval(node.intervalID);
                            node.intervalID = setInterval(sendMsgFromBuffer, node.rate);
                        }
                        node.status({fill:"blue",shape:"dot",text:node.buffer.length});
                        done();
                    }
                }
                else if (!msg.hasOwnProperty("reset")) {
                    if (maxKeptMsgsCount(node) > 0) {
                        if (node.intervalID === -1) {
                            node.send(msg);
                            node.intervalID = setInterval(sendMsgFromBuffer, node.rate);
                        } else {
                            if (node.allowrate && msg.hasOwnProperty("rate") && !isNaN(parseFloat(msg.rate)) && node.rate !== msg.rate) {
                                node.rate = msg.rate;
                                clearInterval(node.intervalID);
                                node.intervalID = setInterval(sendMsgFromBuffer, node.rate);
                            }
                            if (node.buffer.length < _maxKeptMsgsCount) {
                                var m = RED.util.cloneMessage(msg);
                                node.buffer.push({msg: m, send: send, done: done});
                            } else {
                                node.trace("dropped due to buffer overflow. msg._msgid = " + msg._msgid);
                                node.droppedMsgs++;
                            }
                        }
                    } else {
                        if (node.allowrate && msg.hasOwnProperty("rate") && !isNaN(parseFloat(msg.rate))) {
                            node.rate = msg.rate;
                        }
                        var timeSinceLast;
                        if (node.lastSent) {
                            timeSinceLast = process.hrtime(node.lastSent);
                        }
                        if (!node.lastSent) { // ensuring that we always send the first message
                            node.lastSent = process.hrtime();
                            send(msg);
                        }
                        else if ( ( (timeSinceLast[0] * SECONDS_TO_NANOS) + timeSinceLast[1] ) > (node.rate * MILLIS_TO_NANOS) ) {
                            node.lastSent = process.hrtime();
                            send(msg);
                        } else if (node.outputs === 2) {
                            send([null,msg])
                        }
                    }
                    done();
                }

                if (msg.hasOwnProperty("reset")) {
                    if (msg.flush === undefined) {
                        if (node.intervalID !== -1 ) {
                            clearInterval(node.intervalID);
                            node.intervalID = -1;
                        }
                        delete node.lastSent;
                    }
                    node.buffer = [];
                    node.rate = node.fixedrate;
                    node.status({fill:"blue",shape:"ring",text:0});
                    done();
                    return;
                }
            });
            node.on("close", function() {
                clearInterval(node.intervalID);
                clearTimeout(node.busy);
                node.buffer.forEach((msgInfo) => msgInfo.done());
                node.buffer = [];
                node.status({});
            });
        }

        // The topic based fair queue and last arrived on all topics queue
        else if ((node.pauseType === "queue") || (node.pauseType === "timed")) {
            node.intervalID = setInterval(function() {
                if (node.pauseType === "queue") {
                    if (node.buffer.length > 0) {
                        const msgInfo = node.buffer.shift();
                        msgInfo.send(msgInfo.msg); // send the first on the queue
                        msgInfo.done();
                    }
                }
                else {
                    while (node.buffer.length > 0) {    // send the whole queue
                        const msgInfo = node.buffer.shift();
                        msgInfo.send(msgInfo.msg);
                        msgInfo.done();
                    }
                }
                node.reportDepth();
            },node.rate);

            var hit;
            node.on("input", function(msg, send, done) {
                if (node.allowrate && msg.hasOwnProperty("rate") && !isNaN(parseFloat(msg.rate)) && node.rate !== msg.rate) {
                    node.rate = msg.rate;
                    clearInterval(node.intervalID);
                    node.intervalID = setInterval(sendMsgFromBuffer, node.rate);
                }
                if (!msg.hasOwnProperty("topic")) { msg.topic = "_none_"; }
                hit = false;
                for (var b in node.buffer) { // check if already in queue
                    if (msg.topic === node.buffer[b].msg.topic) {
                        if (node.outputs === 2) { send([null,node.buffer[b].msg]) }
                        node.buffer[b].done();
                        node.buffer[b] = {msg, send, done}; // if so - replace existing entry
                        hit = true;
                        break;
                    }
                }
                if (!hit) {
                    node.buffer.push({msg, send, done}); // if not add to end of queue
                    node.reportDepth();
                }
                if (msg.hasOwnProperty("flush")) {
                    var len = node.buffer.length;
                    if (typeof(msg.flush) == 'number') { len = Math.min(Math.floor(msg.flush,len)); }
                    while (len > 0) {
                        const msgInfo = node.buffer.shift();
                        delete msgInfo.msg.flush;
                        delete msgInfo.msg.reset;
                        if (Object.keys(msgInfo.msg).length > 2) {
                            node.send(msgInfo.msg);
                            msgInfo.done();
                        }
                        len = len - 1;
                    }
                    node.status({});
                    done();
                }
                if (msg.hasOwnProperty("reset")) {
                    while (node.buffer.length > 0) {
                        const msgInfo = node.buffer.shift();
                        msgInfo.done();
                    }
                    node.buffer = [];
                    node.rate = node.fixedrate;
                    node.status({text:"reset"});
                    done();
                }
            });
            node.on("close", function() {
                clearInterval(node.intervalID);
                while (node.buffer.length > 0) {
                    const msgInfo = node.buffer.shift();
                    msgInfo.done();
                }
                node.buffer = [];
                node.status({});
            });
        }
    }
    RED.nodes.registerType("delay",DelayNode);
}
