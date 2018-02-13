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
        let msgs = node.pending;
        if (msgs.length > 0) {
            send_msgs(node, msgs, false);
            node.pending = [];
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
        send_msgs(node, msgs, true);
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
            if (!msg.hasOwnProperty("parts") ||
                !msg.parts.hasOwnProperty("id") ||
                !msg.parts.hasOwnProperty("index") ||
                !msg.parts.hasOwnProperty("count")) {
                node.error(RED._("batch.no-parts"), msg);
                return;
            }
            var gid = msg.parts.id;
            var pending = node.pending;
            add_to_topic_group(pending, topic, gid, msg);
            node.pending_count++;
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                node.pending = {};
                node.pending_count = 0;
                node.error(RED._("batch.too-many"), msg);
            }
            try_concat(node, pending);
        }
    }

    function BatchNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var mode = n.mode || "count";

        node.pending_count = 0;
        if (mode === "count") {
            var count = Number(n.count || 1);
            var overlap = Number(n.overlap || 0);
            var is_overlap = (overlap > 0);
            if (count <= overlap) {
                node.error(RED._("batch.count.invalid"));
                return;
            }
            node.pending = [];
            this.on("input", function(msg) {
                var queue = node.pending;
                queue.push(msg);
                node.pending_count++;
                if (queue.length === count) {
                    send_msgs(node, queue, is_overlap);
                    node.pending =
                        (overlap === 0) ? [] : queue.slice(-overlap);
                    node.pending_count = 0;
                }
                var max_msgs = max_kept_msgs_count(node);
                if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                    node.pending = [];
                    node.pending_count = 0;
                    node.error(RED._("batch.too-many"), msg);
                }
            });
            this.on("close", function() {
                node.pending_count = 0;
                node.pending = [];
            });
        }
        else if (mode === "interval") {
            var interval = Number(n.interval || "0") *1000;
            var allow_empty_seq = n.allowEmptySequence;
            node.pending = []
            var timer = setInterval(function() {
                send_interval(node, allow_empty_seq);
                node.pending_count = 0;
            }, interval);
            this.on("input", function(msg) {
                node.pending.push(msg);
                node.pending_count++;
                var max_msgs = max_kept_msgs_count(node);
                if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                    node.pending = [];
                    node.pending_count = 0;
                    node.error(RED._("batch.too-many"), msg);
                }
            });
            this.on("close", function() {
                clearInterval(timer);
                node.pending = [];
                node.pending_count = 0;
            });
        }
        else if(mode === "concat") {
            node.topics = (n.topics || []).map(function(x) {
                return x.topic;
            });
            node.pending = {};
            this.on("input", function(msg) {
                concat_msg(node, msg);
            });
            this.on("close", function() {
                node.pending = {};
                node.pending_count = 0;
            });
        }
        else {
            node.error(RED._("batch.unexpected"));
        }
    }

    RED.nodes.registerType("batch", BatchNode);
}
