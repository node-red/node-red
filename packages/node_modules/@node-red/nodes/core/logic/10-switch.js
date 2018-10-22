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

    var operators = {
        'eq': function(a, b) { return a == b; },
        'neq': function(a, b) { return a != b; },
        'lt': function(a, b) { return a < b; },
        'lte': function(a, b) { return a <= b; },
        'gt': function(a, b) { return a > b; },
        'gte': function(a, b) { return a >= b; },
        'btwn': function(a, b, c) { return a >= b && a <= c; },
        'cont': function(a, b) { return (a + "").indexOf(b) != -1; },
        'regex': function(a, b, c, d) { return (a + "").match(new RegExp(b,d?'i':'')); },
        'true': function(a) { return a === true; },
        'false': function(a) { return a === false; },
        'null': function(a) { return (typeof a == "undefined" || a === null); },
        'nnull': function(a) { return (typeof a != "undefined" && a !== null); },
        'empty': function(a) {
            if (typeof a === 'string' || Array.isArray(a) || Buffer.isBuffer(a)) {
                return a.length === 0;
            } else if (typeof a === 'object' && a !== null) {
                return Object.keys(a).length === 0;
            }
            return false;
        },
        'nempty': function(a) {
            if (typeof a === 'string' || Array.isArray(a) || Buffer.isBuffer(a)) {
                return a.length !== 0;
            } else if (typeof a === 'object' && a !== null) {
                return Object.keys(a).length !== 0;
            }
            return false;
        },

        'istype': function(a, b) {
            if (b === "array") { return Array.isArray(a); }
            else if (b === "buffer") { return Buffer.isBuffer(a); }
            else if (b === "json") {
                try { JSON.parse(a); return true; }   // or maybe ??? a !== null; }
                catch(e) { return false;}
            }
            else if (b === "null") { return a === null; }
            else { return typeof a === b && !Array.isArray(a) && !Buffer.isBuffer(a) && a !== null; }
        },
        'head': function(a, b, c, d, parts) {
            var count = Number(b);
            return (parts.index < count);
        },
        'tail': function(a, b, c, d, parts) {
            var count = Number(b);
            return (parts.count -count <= parts.index);
        },
        'index': function(a, b, c, d, parts) {
            var min = Number(b);
            var max = Number(c);
            var index = parts.index;
            return ((min <= index) && (index <= max));
        },
        'jsonata_exp': function(a, b) { return (b === true); },
        'else': function(a) { return a === true; }
    };

    var _maxKeptCount;

    function getMaxKeptCount() {
        if (_maxKeptCount === undefined) {
            var name = "nodeMessageBufferMaxLength";
            if (RED.settings.hasOwnProperty(name)) {
                _maxKeptCount = RED.settings[name];
            }
            else {
                _maxKeptCount = 0;
            }
        }
        return _maxKeptCount;
    }

    function getProperty(node,msg) {
        if (node.useAsyncRules) {
            return new Promise((resolve,reject) => {
                if (node.propertyType === 'jsonata') {
                    RED.util.evaluateJSONataExpression(node.property,msg,(err,value) => {
                        if (err) {
                            reject(RED._("switch.errors.invalid-expr",{error:err.message}));
                        } else {
                            resolve(value);
                        }
                    });
                } else {
                    RED.util.evaluateNodeProperty(node.property,node.propertyType,node,msg,(err,value) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(value);
                        }
                    });
                }
            });
        } else {
            if (node.propertyType === 'jsonata') {
                try {
                    return RED.util.evaluateJSONataExpression(node.property,msg);
                } catch(err) {
                    throw new Error(RED._("switch.errors.invalid-expr",{error:err.message}))
                }
            } else {
                try {
                    return RED.util.evaluateNodeProperty(node.property,node.propertyType,node,msg);
                } catch(err) {
                    return undefined;
                }
            }
        }
    }

    function getV1(node,msg,rule,hasParts) {
        if (node.useAsyncRules) {
            return new Promise( (resolve,reject) => {
                if (rule.vt === 'prev') {
                    resolve(node.previousValue);
                } else if (rule.vt === 'jsonata') {
                    var exp = rule.v;
                    if (rule.t === 'jsonata_exp') {
                        if (hasParts) {
                            exp.assign("I", msg.parts.index);
                            exp.assign("N", msg.parts.count);
                        }
                    }
                    RED.util.evaluateJSONataExpression(exp,msg,(err,value) => {
                        if (err) {
                            reject(RED._("switch.errors.invalid-expr",{error:err.message}));
                        } else {
                            resolve(value);
                        }
                    });
                } else if (rule.vt === 'json') {
                    resolve("json"); // TODO: ?! invalid case
                } else if (rule.vt === 'null') {
                    resolve("null");
                } else {
                    RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg, function(err,value) {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(value);
                        }
                    });
                }
            });
        } else {
            if (rule.vt === 'prev') {
                return node.previousValue;
            } else if (rule.vt === 'jsonata') {
                var exp = rule.v;
                if (rule.t === 'jsonata_exp') {
                    if (hasParts) {
                        exp.assign("I", msg.parts.index);
                        exp.assign("N", msg.parts.count);
                    }
                }
                try {
                    return RED.util.evaluateJSONataExpression(exp,msg);
                } catch(err) {
                    throw new Error(RED._("switch.errors.invalid-expr",{error:err.message}))
                }
            } else if (rule.vt === 'json') {
                return "json"; // TODO: ?! invalid case
            } else if (rule.vt === 'null') {
                return "null";
            } else {
                try {
                    return RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg);
                } catch(err) {
                    return undefined;
                }
            }
        }
    }

    function getV2(node,msg,rule) {
        if (node.useAsyncRules) {
            return new Promise((resolve,reject) => {
                var v2 = rule.v2;
                if (rule.v2t === 'prev') {
                    resolve(node.previousValue);
                } else if (rule.v2t === 'jsonata') {
                    RED.util.evaluateJSONataExpression(rule.v2,msg,(err,value) => {
                        if (err) {
                            reject(RED._("switch.errors.invalid-expr",{error:err.message}));
                        } else {
                            resolve(value);
                        }
                    });
                } else if (typeof v2 !== 'undefined') {
                    RED.util.evaluateNodeProperty(rule.v2,rule.v2t,node,msg, function(err,value) {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(value);
                        }
                    });
                } else {
                    resolve(v2);
                }
            })
        } else {
            var v2 = rule.v2;
            if (rule.v2t === 'prev') {
                return node.previousValue;
            } else if (rule.v2t === 'jsonata') {
                try {
                    return RED.util.evaluateJSONataExpression(rule.v2,msg);
                } catch(err) {
                    throw new Error(RED._("switch.errors.invalid-expr",{error:err.message}))
                }
            } else if (typeof v2 !== 'undefined') {
                try {
                    return RED.util.evaluateNodeProperty(rule.v2,rule.v2t,node,msg);
                } catch(err) {
                    return undefined;
                }
            } else {
                return v2;
            }
        }
    }

    function applyRule(node, msg, property, state) {
        if (node.useAsyncRules) {
            return new Promise((resolve,reject) => {

                var rule = node.rules[state.currentRule];
                var v1,v2;

                getV1(node,msg,rule,state.hasParts).then(value => {
                    v1 = value;
                }).then(()=>getV2(node,msg,rule)).then(value => {
                    v2 = value;
                }).then(() => {
                    if (rule.t == "else") {
                        property = state.elseflag;
                        state.elseflag = true;
                    }
                    if (operators[rule.t](property,v1,v2,rule.case,msg.parts)) {
                        state.onward.push(msg);
                        state.elseflag = false;
                        if (node.checkall == "false") {
                            return resolve(false);
                        }
                    } else {
                        state.onward.push(null);
                    }
                    resolve(state.currentRule < node.rules.length - 1);
                });
            })
        } else {
            var rule = node.rules[state.currentRule];
            var v1 = getV1(node,msg,rule,state.hasParts);
            var v2 = getV2(node,msg,rule);
            if (rule.t == "else") {
                property = state.elseflag;
                state.elseflag = true;
            }
            if (operators[rule.t](property,v1,v2,rule.case,msg.parts)) {
                state.onward.push(msg);
                state.elseflag = false;
                if (node.checkall == "false") {
                    return false;
                }
            } else {
                state.onward.push(null);
            }
            return state.currentRule < node.rules.length - 1
        }
    }

    function applyRules(node, msg, property,state) {
        if (!state) {
            state = {
                currentRule: 0,
                elseflag: true,
                onward: [],
                hasParts: msg.hasOwnProperty("parts") &&
                                msg.parts.hasOwnProperty("id") &&
                                msg.parts.hasOwnProperty("index")
            }
        }
        if (node.useAsyncRules) {
            return applyRule(node,msg,property,state).then(hasMore => {
                if (hasMore) {
                    state.currentRule++;
                    return applyRules(node,msg,property,state);
                } else {
                    node.previousValue = property;
                    return state.onward;
                }
            });
        } else {
            var hasMore = applyRule(node,msg,property,state);
            if (hasMore) {
                state.currentRule++;
                return applyRules(node,msg,property,state);
            } else {
                node.previousValue = property;
                return state.onward;
            }
        }
    }


    function SwitchNode(n) {
        RED.nodes.createNode(this, n);
        this.rules = n.rules || [];
        this.property = n.property;
        this.propertyType = n.propertyType || "msg";

        if (this.propertyType === 'jsonata') {
            try {
                this.property = RED.util.prepareJSONataExpression(this.property,this);
            } catch(err) {
                this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                return;
            }
        }

        this.checkall = n.checkall || "true";
        this.previousValue = null;
        var node = this;
        var valid = true;
        var repair = n.repair;
        var needsCount = repair;
        this.useAsyncRules = (
            this.propertyType === 'flow' ||
            this.propertyType === 'global' || (
                this.propertyType === 'jsonata' &&
                /\$(flow|global)Context/.test(this.property)
            )
        );

        for (var i=0; i<this.rules.length; i+=1) {
            var rule = this.rules[i];
            needsCount = needsCount || ((rule.t === "tail") || (rule.t === "jsonata_exp"));
            if (!rule.vt) {
                if (!isNaN(Number(rule.v))) {
                    rule.vt = 'num';
                } else {
                    rule.vt = 'str';
                }
            }
            this.useAsyncRules = this.useAsyncRules || (
                rule.vt === 'flow' ||
                rule.vt === 'global' || (
                    rule.vt === 'jsonata' &&
                    /\$(flow|global)Context/.test(rule.v)
                )
            );
            if (rule.vt === 'num') {
                if (!isNaN(Number(rule.v))) {
                    rule.v = Number(rule.v);
                }
            } else if (rule.vt === "jsonata") {
                try {
                    rule.v = RED.util.prepareJSONataExpression(rule.v,node);
                } catch(err) {
                    this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                    valid = false;
                }
            }
            if (rule.vt === 'flow' || rule.vt === 'global' || rule.vt === 'jsonata') {
                this.useAsyncRules = true;
            }
            if (typeof rule.v2 !== 'undefined') {
                if (!rule.v2t) {
                    if (!isNaN(Number(rule.v2))) {
                        rule.v2t = 'num';
                    } else {
                        rule.v2t = 'str';
                    }
                }
                this.useAsyncRules = this.useAsyncRules || (
                    rule.v2t === 'flow' ||
                    rule.v2t === 'global' || (
                        rule.v2t === 'jsonata' &&
                        /\$(flow|global)Context/.test(rule.v2)
                    )
                );
                if (rule.v2t === 'num') {
                    rule.v2 = Number(rule.v2);
                } else if (rule.v2t === 'jsonata') {
                    try {
                        rule.v2 = RED.util.prepareJSONataExpression(rule.v2,node);
                    } catch(err) {
                        this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                        valid = false;
                    }
                }
            }
        }
        if (!valid) {
            return;
        }

        var pendingCount = 0;
        var pendingId = 0;
        var pendingIn = {};
        var pendingOut = {};
        var received = {};

        function addMessageToGroup(id, msg, parts) {
            if (!(id in pendingIn)) {
                pendingIn[id] = {
                    count: undefined,
                    msgs: [],
                    seq_no: pendingId++
                };
            }
            var group = pendingIn[id];
            group.msgs.push(msg);
            pendingCount++;
            var max_msgs = getMaxKeptCount();
            if ((max_msgs > 0) && (pendingCount > max_msgs)) {
                clearPending();
                node.error(RED._("switch.errors.too-many"), msg);
            }
            if (parts.hasOwnProperty("count")) {
                group.count = parts.count;
            }
            return group;
        }


        function addMessageToPending(msg) {
            var parts = msg.parts;
            // We've already checked the msg.parts has the require bits
            var group = addMessageToGroup(parts.id, msg, parts);
            var msgs = group.msgs;
            var count = group.count;
            if (count === msgs.length) {
                // We have a complete group - send the individual parts
                return msgs.reduce((promise, msg) => {
                    return promise.then((result) => {
                        msg.parts.count = count;
                        return processMessage(msg, false);
                    })
                }, Promise.resolve()).then( () => {
                    pendingCount -= group.msgs.length;
                    delete pendingIn[parts.id];
                });
            }
            return Promise.resolve();
        }

        function sendGroup(onwards, port_count) {
            var counts = new Array(port_count).fill(0);
            for (var i = 0; i < onwards.length; i++) {
                var onward = onwards[i];
                for (var j = 0; j < port_count; j++) {
                    counts[j] += (onward[j] !== null) ? 1 : 0
                }
            }
            var ids = new Array(port_count);
            for (var j = 0; j < port_count; j++) {
                ids[j] = RED.util.generateId();
            }
            var ports = new Array(port_count);
            var indexes = new Array(port_count).fill(0);
            for (var i = 0; i < onwards.length; i++) {
                var onward = onwards[i];
                for (var j = 0; j < port_count; j++) {
                    var msg = onward[j];
                    if (msg) {
                        var new_msg = RED.util.cloneMessage(msg);
                        var parts = new_msg.parts;
                        parts.id = ids[j];
                        parts.index = indexes[j];
                        parts.count = counts[j];
                        ports[j] = new_msg;
                        indexes[j]++;
                    }
                    else {
                        ports[j] = null;
                    }
                }
                node.send(ports);
            }
        }

        function sendGroupMessages(onward, msg) {
            var parts = msg.parts;
            var gid = parts.id;
            received[gid] = ((gid in received) ? received[gid] : 0) +1;
            var send_ok = (received[gid] === parts.count);

            if (!(gid in pendingOut)) {
                pendingOut[gid] = {
                    onwards: []
                };
            }
            var group = pendingOut[gid];
            var onwards = group.onwards;
            onwards.push(onward);
            pendingCount++;
            if (send_ok) {
                sendGroup(onwards, onward.length, msg);
                pendingCount -= onward.length;
                delete pendingOut[gid];
                delete received[gid];
            }
            var max_msgs = getMaxKeptCount();
            if ((max_msgs > 0) && (pendingCount > max_msgs)) {
                clearPending();
                node.error(RED._("switch.errors.too-many"), msg);
            }
        }





        function processMessage(msg, checkParts) {
            var hasParts = msg.hasOwnProperty("parts") &&
                            msg.parts.hasOwnProperty("id") &&
                            msg.parts.hasOwnProperty("index");

            if (needsCount && checkParts && hasParts) {
                return addMessageToPending(msg);
            }
            if (node.useAsyncRules) {
                return getProperty(node,msg)
                        .then(property => applyRules(node,msg,property))
                        .then(onward => {
                            if (!repair || !hasParts) {
                                node.send(onward);
                            }
                            else {
                                sendGroupMessages(onward, msg);
                            }
                        }).catch(err => {
                            node.warn(err);
                        });
            } else {
                try {
                    var property = getProperty(node,msg);
                    var onward = applyRules(node,msg,property);
                    if (!repair || !hasParts) {
                        node.send(onward);
                    } else {
                        sendGroupMessages(onward, msg);
                    }
                } catch(err) {
                    node.warn(err);
                }
            }
        }

        function clearPending() {
            pendingCount = 0;
            pendingId = 0;
            pendingIn = {};
            pendingOut = {};
            received = {};
        }

        var pendingMessages = [];
        var activeMessagePromise = null;
        var processMessageQueue = function(msg) {
            if (msg) {
                // A new message has arrived - add it to the message queue
                pendingMessages.push(msg);
                if (activeMessagePromise !== null) {
                    // The node is currently processing a message, so do nothing
                    // more with this message
                    return;
                }
            }
            if (pendingMessages.length === 0) {
                // There are no more messages to process, clear the active flag
                // and return
                activeMessagePromise = null;
                return;
            }

            // There are more messages to process. Get the next message and
            // start processing it. Recurse back in to check for any more
            var nextMsg = pendingMessages.shift();
            activeMessagePromise = processMessage(nextMsg,true)
                .then(processMessageQueue)
                .catch((err) => {
                    node.error(err,nextMsg);
                    return processMessageQueue();
                });
        }

        this.on('input', function(msg) {
            if (node.useAsyncRules) {
                processMessageQueue(msg);
            } else {
                processMessage(msg,true);
            }
        });

        this.on('close', function() {
            clearPending();
        });
    }

    RED.nodes.registerType("switch", SwitchNode);
}
