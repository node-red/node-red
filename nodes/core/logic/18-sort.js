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

    var _max_kept_msgs_count;

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

    // function get_context_val(node, name, dval) {
    //     var context = node.context();
    //     var val = context.get(name);
    //     if (val === undefined) {
    //         context.set(name, dval);
    //         return dval;
    //     }
    //     return val;
    // }

    function SortNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        var pending = {};//get_context_val(node, 'pending', {})
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
                node.error(RED._("sort.invalid-exp",{message:e.toString()}));
                return;
            }
        }
        var dir = (order === "ascending") ? 1 : -1;
        var conv = as_num ? function(x) { return Number(x); }
                          : function(x) { return x; };

        function generateComparisonFunction(key) {
            return function(x, y) {
                var xp = conv(key(x));
                var yp = conv(key(y));
                if (xp === yp) { return 0; }
                if (xp > yp) { return dir; }
                return -dir;
            };
        }

        function sortMessageGroup(group) {
            var promise;
            var msgs = group.msgs;
            if (key_is_exp) {
                var evaluatedDataPromises = msgs.map(msg => {
                    return new Promise((resolve,reject) => {
                        RED.util.evaluateJSONataExpression(key_exp, msg, (err, result) => {
                            if (err) {
                                reject(RED._("sort.invalid-exp",{message:err.toString()}));
                            } else {
                                resolve({
                                    item: msg,
                                    sortValue: result
                                })
                            }
                        });
                    })
                });
                promise = Promise.all(evaluatedDataPromises).then(evaluatedElements => {
                    // Once all of the sort keys are evaluated, sort by them
                    var comp = generateComparisonFunction(elem=>elem.sortValue);
                    return evaluatedElements.sort(comp).map(elem=>elem.item);
                });
            } else {
                var key = function(msg) {
                    return ;
                }
                var comp = generateComparisonFunction(msg => RED.util.getMessageProperty(msg, key_prop));
                try {
                    msgs.sort(comp);
                }
                catch (e) {
                    return; // not send when error
                }
                promise = Promise.resolve(msgs);
            }
            return promise.then(msgs => {
                for (var i = 0; i < msgs.length; i++) {
                    var msg = msgs[i];
                    msg.parts.index = i;
                    node.send(msg);
                }
            });
        }

        function sortMessageProperty(msg) {
            var data = RED.util.getMessageProperty(msg, target_prop);
            if (Array.isArray(data)) {
                if (key_is_exp) {
                    // key is an expression. Evaluated the expression for each item
                    // to get its sort value. As this could be async, need to do
                    // it first.
                    var evaluatedDataPromises = data.map(elem => {
                        return new Promise((resolve,reject) => {
                            RED.util.evaluateJSONataExpression(key_exp, elem, (err, result) => {
                                if (err) {
                                    reject(RED._("sort.invalid-exp",{message:err.toString()}));
                                } else {
                                    resolve({
                                        item: elem,
                                        sortValue: result
                                    })
                                }
                            });
                        })
                    })
                    return Promise.all(evaluatedDataPromises).then(evaluatedElements => {
                        // Once all of the sort keys are evaluated, sort by them
                        // and reconstruct the original message item with the newly
                        // sorted values.
                        var comp = generateComparisonFunction(elem=>elem.sortValue);
                        data = evaluatedElements.sort(comp).map(elem=>elem.item);
                        RED.util.setMessageProperty(msg, target_prop,data);
                        return true;
                    })
                } else {
                    var comp = generateComparisonFunction(elem=>elem);
                    try {
                        data.sort(comp);
                    } catch (e) {
                        return Promise.resolve(false);
                    }
                    return Promise.resolve(true);
                }
            }
            return Promise.resolve(false);
        }

        function removeOldestPending() {
            var oldest;
            var oldest_key;
            for(var key in pending) {
                if (pending.hasOwnProperty(key)) {
                    var item = pending[key];
                    if((oldest === undefined) ||
                       (oldest.seq_no > item.seq_no)) {
                        oldest = item;
                        oldest_key = key;
                    }
                }
            }
            if(oldest !== undefined) {
                delete pending[oldest_key];
                return oldest.msgs.length;
            }
            return 0;
        }

        function processMessage(msg) {
            if (target_is_prop) {
                sortMessageProperty(msg).then(send => {
                    if (send) {
                        node.send(msg);
                    }
                }).catch(err => {
                    node.error(err,msg);
                });
                return;
            }
            var parts = msg.parts;
            if (!parts || !parts.hasOwnProperty("id") || !parts.hasOwnProperty("index")) {
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
                sortMessageGroup(group).catch(err => {
                    node.error(err,msg);
                });
                pending_count -= msgs.length;
            } else {
                var max_msgs = max_kept_msgs_count(node);
                if ((max_msgs > 0) && (pending_count > max_msgs)) {
                    pending_count -= removeOldestPending();
                    node.error(RED._("sort.too-many"), msg);
                }
            }
        }

        this.on("input", function(msg) {
            processMessage(msg);
        });

        this.on("close", function() {
            for(var key in pending) {
                if (pending.hasOwnProperty(key)) {
                    node.log(RED._("sort.clear"), pending[key].msgs[0]);
                    delete pending[key];
                }
            }
            pending_count = 0;
        });
    }

    RED.nodes.registerType("sort", SortNode);
}
