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
            var name = "batchMaxKeptMsgsCount";
            if (RED.settings.hasOwnProperty(name)) {
                _max_kept_msgs_count = RED.settings[name];
            }
            else {
                _max_kept_msgs_count = 0;
            }
        }
        return _max_kept_msgs_count;
    }

    function send_msgs(node, msgs, clone_msg) {
        var count = msgs.length;
        var msg_id = msgs[0]._msgid;
        for (var i = 0; i < count; i++) {
            var msg = clone_msg ? RED.util.cloneMessage(msgs[i]) : msgs[i];
            if (!msg.hasOwnProperty("parts")) {
                msg.parts = {};
            }
            var parts = msg.parts;
            parts.id = msg_id;
            parts.index = i;
            parts.count = count;
            node.send(msg);
        }
    }
    
    function send_interval(node, allow_empty_seq) {
        let msgs = node.msg_queue;
        if (msgs.length > 0) {
            send_msgs(node, msgs, false);
            node.msg_queue = [];
        }
        else {
            if (allow_empty_seq) {
                let mid = RED.util.generateId();
                let msg = {
                    payload: null,
                    parts: {
                        id: mid,
                        index: 0,
                        count: 1
                    }
                };
                node.send(msg);
            }
        }
    }

    function is_complete(pending, topic) {
        if (pending.hasOwnProperty(topic)) {
            var p_topic = pending[topic];
            var gids = p_topic.gids;
            if (gids.length > 0) {
                var gid = gids[0];
                var groups = p_topic.groups;
                var group = groups[gid];
                return (group.count === group.msgs.length);
            }
        }
        return false;
    }

    function get_msgs_of_topic(pending, topic) {
        var p_topic = pending[topic];
        var groups = p_topic.groups;
        var gids = p_topic.gids;
        var gid = gids[0];
        var group = groups[gid];
        return group.msgs;
    }

    function remove_topic(pending, topic) {
        var p_topic = pending[topic];
        var groups = p_topic.groups;
        var gids = p_topic.gids;
        var gid = gids.shift();
        delete groups[gid];
    }

    function try_concat(node, pending) {
        var topics = node.topics;
        for (var topic of topics) {
            if (!is_complete(pending, topic)) {
                return;
            }
        }
        var msgs = [];
        for (var topic of topics) {
            var t_msgs = get_msgs_of_topic(pending, topic);
            msgs = msgs.concat(t_msgs);
        }
        for (var topic of topics) {
            remove_topic(pending, topic);
        }
        send_msgs(node, msgs, false);
        node.pending_count -= msgs.length;
    }
    
    function add_to_topic_group(pending, topic, gid, msg) {
        if (!pending.hasOwnProperty(topic)) {
            pending[topic] = { groups: {}, gids: [] };
        }
        var p_topic = pending[topic];
        var groups = p_topic.groups;
        var gids = p_topic.gids;
        if (!groups.hasOwnProperty(gid)) {
            groups[gid] = { msgs: [], count: undefined };
            gids.push(gid);
        }
        var group = groups[gid];
        group.msgs.push(msg);
        if ((group.count === undefined) &&
            msg.parts.hasOwnProperty('count')) {
            group.count = msg.parts.count;
        }
    }

    function concat_msg(node, msg) {
        var topic = msg.topic;
        if(node.topics.indexOf(topic) >= 0) {
            var gid = msg.parts.id;
            var pending = node.pending;
            add_to_topic_group(pending, topic, gid, msg);
            node.pending_count++;
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                node.pending = {};
                node.pending_count = 0;
                throw new Error("too many pending messages");
            }
            try_concat(node, pending);
        }
    }

    function BatchNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var mode = n.mode || "count";

        if (mode === "count") {
            var count = Number(n.count || 1);
            var overwrap = Number(n.overwrap || 0);
            var is_overwrap = (overwrap > 0);
            if (count <= overwrap) {
                this.error("Invalid count and overwrap");
                return;
            }
            var queue = [];
            this.on("input", function(msg) {
                queue.push(msg);
                var len = queue.length;
                if (len === count) {
                    send_msgs(node, queue, is_overwrap);
                    queue = (overwrap === 0) ? [] :  queue.slice(-overwrap);
                }
            });
            this.on("close", function() {
                queue = [];
            });
        }
        else if (mode === "interval") {
            var interval = Number(n.interval || "0") *1000;
            var allow_empty_seq = n.allowEmptySequence;
            node.msg_queue = []
            var timer = setInterval(function() {
                send_interval(node, allow_empty_seq);
            }, interval);
            this.on("input", function(msg) {
                node.msg_queue.push(msg);
            });
            this.on("close", function() {
                clearInterval(timer);
                node.msg_queue = [];
            });
        }
        else if(mode === "concat") {
            node.topics = (n.topics || []).map(function(x) {
                return x.topic;
            });
            node.pending = {};
            node.pending_count = 0;
            this.on("input", function(msg) {
                concat_msg(node, msg);
            });
            this.on("close", function(msg) {
                node.pending = {};
                node.pending_count = 0;
            });
        }
        else {
            node.error("unexpected mode");
        }
    }
    RED.nodes.registerType("batch", BatchNode);
}
