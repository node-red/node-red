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

    function eval_jsonata(node, code, val) {
        try {
            return RED.util.evaluateJSONataExpression(code, val);
        }
        catch (e) {
            node.error(RED._("sort.invalid-exp"));
            throw e;
        }
    }

    function get_context_val(node, name, dval) {
        var context = node.context();
        var val = context.get(name);
        if (val === undefined) {
            context.set(name, dval);
            return dval;
        }
        return val;
    }

    function SortNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        var pending = get_context_val(node, 'pending', {})
        var pending_count = 0;
        var pending_id = 0;
        var order = n.order || "ascending";
        var as_num = n.as_num || false;
        var target_prop = n.target || "payload";
        var target_is_prop = (n.targetType === 'msg');
        var key_is_exp = target_is_prop ? (n.msgKeyType === "jsonata") : (n.seqKeyType === "jsonata");
        var key_prop = n.seqKey || "payload";
        var key_exp = target_is_prop ? n.msgKey : n.seqKey;

        if (key_is_exp) {
            try {
                key_exp = RED.util.prepareJSONataExpression(key_exp, this);
            }
            catch (e) {
                node.error(RED._("sort.invalid-exp"));
                return;
            }
        }
        var dir = (order === "ascending") ? 1 : -1;
        var conv = as_num
            ? function(x) { return Number(x); }
            : function(x) { return x; };

        function gen_comp(key) {
            return function(x, y) {
                var xp = conv(key(x));
                var yp = conv(key(y));
                if (xp === yp) { return 0; }
                if (xp > yp) { return dir; }
                return -dir;
            };
        }

        function send_group(group) {
            var key = key_is_exp
                ? function(msg) {
                    return eval_jsonata(node, key_exp, msg);
                }
                : function(msg) {
                    return RED.util.getMessageProperty(msg, key_prop);
                };
            var comp = gen_comp(key);
            var msgs = group.msgs;
            try {
                msgs.sort(comp);
            }
            catch (e) {
                return; // not send when error
            }
            for (var i = 0; i < msgs.length; i++) {
                var msg = msgs[i];
                msg.parts.index = i;
                node.send(msg);
            }
        }

        function sort_payload(msg) {
            var data = RED.util.getMessageProperty(msg, target_prop);
            if (Array.isArray(data)) {
                var key = key_is_exp
                    ? function(elem) {
                        return eval_jsonata(node, key_exp, elem);
                    }
                    : function(elem) { return elem; };
                var comp = gen_comp(key);
                try {
                    data.sort(comp);
                }
                catch (e) {
                    return false;
                }
                return true;
            }
            return false;
        }

        function check_parts(parts) {
            if (parts.hasOwnProperty("id") &&
                parts.hasOwnProperty("index")) {
                return true;
            }
            return false;
        }

        function clear_pending() {
            for(var key in pending) {
                node.log(RED._("sort.clear"), pending[key].msgs[0]);
                delete pending[key];
            }
            pending_count = 0;
        }

        function remove_oldest_pending() {
            var oldest = undefined;
            var oldest_key = undefined;
            for(var key in pending) {
                var item = pending[key];
                if((oldest === undefined) ||
                   (oldest.seq_no > item.seq_no)) {
                    oldest = item;
                    oldest_key = key;
                }
            }
            if(oldest !== undefined) {
                delete pending[oldest_key];
                return oldest.msgs.length;
            }
            return 0;
        }
        
        function process_msg(msg) {
            if (target_is_prop) {
                if (sort_payload(msg)) {
                    node.send(msg);
                }
                return;
            }
            var parts = msg.parts;
            if (!check_parts(parts)) {
                return;
            }
            var gid = parts.id;
            if (!pending.hasOwnProperty(gid)) {
                pending[gid] = {
                    count: undefined,
                    msgs: [],
                    seq_no: pending_id++
                };
            }
            var group = pending[gid];
            var msgs = group.msgs;
            msgs.push(msg);
            if (parts.hasOwnProperty("count")) {
                group.count = parts.count;
            }
            pending_count++;
            if (group.count === msgs.length) {
                delete pending[gid]
                send_group(group);
                pending_count -= msgs.length;
            }
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (pending_count > max_msgs)) {
                pending_count -= remove_oldest_pending();
                node.error(RED._("sort.too-many"), msg);
            }
        }
        
        this.on("input", function(msg) {
            process_msg(msg);
        });

        this.on("close", function() {
            clear_pending();
        })
    }

    RED.nodes.registerType("sort", SortNode);
}
