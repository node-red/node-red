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

    var _max_kept_msgs_count = undefined;

    function max_kept_msgs_count(node) {
        if (_max_kept_msgs_count === undefined) {
            var name = "nodeMessageBufferMaxLength";
            if (RED.settings.hasOwnProperty(name)) {
                _max_kept_msgs_count = RED.settings[name];
            }
            else {
                _max_kept_msgs_count = 0;
            }
        }
        return _max_kept_msgs_count;
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
        var needs_count = repair;
        for (var i=0; i<this.rules.length; i+=1) {
            var rule = this.rules[i];
            needs_count = needs_count || ((rule.t === "tail") || (rule.t === "jsonata_exp"));
            if (!rule.vt) {
                if (!isNaN(Number(rule.v))) {
                    rule.vt = 'num';
                } else {
                    rule.vt = 'str';
                }
            }
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
            if (typeof rule.v2 !== 'undefined') {
                if (!rule.v2t) {
                    if (!isNaN(Number(rule.v2))) {
                        rule.v2t = 'num';
                    } else {
                        rule.v2t = 'str';
                    }
                }
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

        var pending_count = 0;
        var pending_id = 0;
        var pending_in = {};
        var pending_out = {};
        var received = {};

        function add2group_in(id, msg, parts) {
            if (!(id in pending_in)) {
                pending_in[id] = {
                    count: undefined,
                    msgs: [],
                    seq_no: pending_id++
                };
            }
            var group = pending_in[id];
            group.msgs.push(msg);
            pending_count++;
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (pending_count > max_msgs)) {
                clear_pending();
                node.error(RED._("switch.errors.too-many"), msg);
            }
            if (parts.hasOwnProperty("count")) {
                group.count = parts.count;
            }
            return group;
        }

        function del_group_in(id, group) {
            pending_count -= group.msgs.length;
            delete pending_in[id];
        }

        function add2pending_in(msg) {
            var parts = msg.parts;
            if (parts.hasOwnProperty("id") &&
                parts.hasOwnProperty("index")) {
                var group = add2group_in(parts.id, msg, parts);
                var msgs = group.msgs;
                var count = group.count;
                if (count === msgs.length) {
                    for (var i = 0; i < msgs.length; i++) {
                        var msg = msgs[i];
                        msg.parts.count = count;
                        process_msg(msg, false);
                    }
                    del_group_in(parts.id, group);
                }
                return true;
            }
            return false;
        }

        function send_group(onwards, port_count) {
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

        function send2ports(onward, msg) {
            var parts = msg.parts;
            var gid = parts.id;
            received[gid] = ((gid in received) ? received[gid] : 0) +1;
            var send_ok = (received[gid] === parts.count);

            if (!(gid in pending_out)) {
                pending_out[gid] = {
                    onwards: []
                };
            }
            var group = pending_out[gid];
            var onwards = group.onwards;
            onwards.push(onward);
            pending_count++;
            if (send_ok) {
                send_group(onwards, onward.length, msg);
                pending_count -= onward.length;
                delete pending_out[gid];
                delete received[gid];
            }
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (pending_count > max_msgs)) {
                clear_pending();
                node.error(RED._("switch.errors.too-many"), msg);
            }
        }

        function msg_has_parts(msg) {
            if (msg.hasOwnProperty("parts")) {
                var parts = msg.parts;
                return (parts.hasOwnProperty("id") &&
                        parts.hasOwnProperty("index"));
            }
            return false;
        }

        function process_msg(msg, check_parts) {
            var has_parts = msg_has_parts(msg);
            if (needs_count && check_parts && has_parts &&
                add2pending_in(msg)) {
                return;
            }
            var onward = [];
            try {
                var prop;
                if (node.propertyType === 'jsonata') {
                    prop = RED.util.evaluateJSONataExpression(node.property,msg);
                } else {
                    prop = RED.util.evaluateNodeProperty(node.property,node.propertyType,node,msg);
                }
                var elseflag = true;
                for (var i=0; i<node.rules.length; i+=1) {
                    var rule = node.rules[i];
                    var test = prop;
                    var v1,v2;
                    if (rule.vt === 'prev') {
                        v1 = node.previousValue;
                    } else if (rule.vt === 'jsonata') {
                        try {
                            var exp = rule.v;
                            if (rule.t === 'jsonata_exp') {
                                if (has_parts) {
                                    exp.assign("I", msg.parts.index);
                                    exp.assign("N", msg.parts.count);
                                }
                            }
                            v1 = RED.util.evaluateJSONataExpression(exp,msg);
                        } catch(err) {
                            node.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                            return;
                        }
                    } else {
                        try {
                            v1 = RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg);
                        } catch(err) {
                            v1 = undefined;
                        }
                    }
                    v2 = rule.v2;
                    if (rule.v2t === 'prev') {
                        v2 = node.previousValue;
                    } else if (rule.v2t === 'jsonata') {
                        try {
                            v2 = RED.util.evaluateJSONataExpression(rule.v2,msg);
                        } catch(err) {
                            node.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                            return;
                        }
                    } else if (typeof v2 !== 'undefined') {
                        try {
                            v2 = RED.util.evaluateNodeProperty(rule.v2,rule.v2t,node,msg);
                        } catch(err) {
                            v2 = undefined;
                        }
                    }
                    if (rule.t == "else") { test = elseflag; elseflag = true; }
                    if (operators[rule.t](test,v1,v2,rule.case,msg.parts)) {
                        onward.push(msg);
                        elseflag = false;
                        if (node.checkall == "false") { break; }
                    } else {
                        onward.push(null);
                    }
                }
                node.previousValue = prop;
                if (!repair || !has_parts) {
                    node.send(onward);
                }
                else {
                    send2ports(onward, msg);
                }
            } catch(err) {
                node.warn(err);
            }
        }

        function clear_pending() {
            pending_count = 0;
            pending_id = 0;
            pending_in = {};
            pending_out = {};
            received = {};
        }

        this.on('input', function(msg) {
            process_msg(msg, true);
        });

        this.on('close', function() {
            clear_pending();
        });
    }

    RED.nodes.registerType("switch", SwitchNode);
}
