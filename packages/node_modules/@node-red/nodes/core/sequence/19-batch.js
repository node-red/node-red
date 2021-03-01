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

    function send_msgs(node, msgInfos, clone_msg) {
        var count = msgInfos.length;
        var msg_id = msgInfos[0].msg._msgid;
        for (var i = 0; i < count; i++) {
            var msg = clone_msg ? RED.util.cloneMessage(msgInfos[i].msg) : msgInfos[i].msg;
            if (!msg.hasOwnProperty("parts")) {
                msg.parts = {};
            }
            var parts = msg.parts;
            parts.id = msg_id;
            parts.index = i;
            parts.count = count;
            msgInfos[i].send(msg);
            //msgInfos[i].done();
        }
    }

    function send_interval(node, allow_empty_seq) {
        let msgInfos = node.pending;
        if (msgInfos.length > 0) {
            send_msgs(node, msgInfos, false);
            msgInfos.forEach(e => e.done());
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
        var msgInfos = [];
        for (var topic of topics) {
            var t_msgInfos = get_msgs_of_topic(pending, topic);
            msgInfos = msgInfos.concat(t_msgInfos);
        }
        for (var topic of topics) {
            remove_topic(pending, topic);
        }
        send_msgs(node, msgInfos, true);
        msgInfos.forEach(e => e.done() );
        node.pending_count -= msgInfos.length;
    }

    function add_to_topic_group(pending, topic, gid, msgInfo) {
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
        group.msgs.push(msgInfo);
        if ((group.count === undefined) &&
            msgInfo.msg.parts.hasOwnProperty('count')) {
            group.count = msgInfo.msg.parts.count;
        }
    }

    function concat_msg(node, msg, send, done) {
        var topic = msg.topic;
        if(node.topics.indexOf(topic) >= 0) {
            if (!msg.hasOwnProperty("parts") ||
                !msg.parts.hasOwnProperty("id") ||
                !msg.parts.hasOwnProperty("index") ||
                !msg.parts.hasOwnProperty("count")) {
                done(RED._("batch.no-parts"));
                return;
            }
            var gid = msg.parts.id;
            var pending = node.pending;
            add_to_topic_group(pending, topic, gid, {msg, send, done});
            node.pending_count++;
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                Object.values(node.pending).forEach(p_topic => {
                    Object.values(p_topic.groups).forEach(group => {
                        group.msgs.forEach(msgInfo => {
                            if (msgInfo.msg.id === msg.id) {
                                // the message that caused the overflow
                                msgInfo.done(RED._("batch.too-many"));
                            } else {
                                msgInfo.done();
                            }
                        })
                    })
                });
                node.pending = {};
                node.pending_count = 0;
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
            this.on("input", function(msg, send, done) {
                if (msg.hasOwnProperty("reset")) {
                    node.pending.forEach(e => e.done());
                    node.pending = [];
                    node.pending_count = 0;
                    done();
                    return;
                }
                var queue = node.pending;
                queue.push({msg, send, done});
                node.pending_count++;
                if (queue.length === count) {
                    send_msgs(node, queue, is_overlap);
                    for (let i = 0; i < queue.length-overlap; i++) {
                        queue[i].done();
                    }
                    node.pending =
                        (overlap === 0) ? [] : queue.slice(-overlap);
                    node.pending_count = 0;
                }
                var max_msgs = max_kept_msgs_count(node);
                if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                    let lastMInfo = node.pending.pop();
                    lastMInfo.done(RED._("batch.too-many"));
                    node.pending.forEach(e => e.done());
                    node.pending = [];
                    node.pending_count = 0;
                }
            });
            this.on("close", function() {
                node.pending.forEach(e=> e.done());
                node.pending_count = 0;
                node.pending = [];
            });
        }
        else if (mode === "interval") {
            var interval = Number(n.interval || "0") *1000;
            var allow_empty_seq = n.allowEmptySequence;
            node.pending = []
            function msgHandler() {
                send_interval(node, allow_empty_seq);
                node.pending_count = 0;
            }
            var timer = undefined;
            if (interval > 0) {
                timer = setInterval(msgHandler, interval);
            }
            this.on("input", function(msg, send, done) {
                if (msg.hasOwnProperty("reset")) {
                    if (timer !== undefined) {
                        clearInterval(timer);
                    }
                    node.pending.forEach(e => e.done());
                    node.pending = [];
                    node.pending_count = 0;
                    done();
                    if (interval > 0) {
                        timer = setInterval(msgHandler, interval);
                    }
                    return;
                }
                node.pending.push({msg, send, done});
                node.pending_count++;
                var max_msgs = max_kept_msgs_count(node);
                if ((max_msgs > 0) && (node.pending_count > max_msgs)) {
                    let lastMInfo = node.pending.pop();
                    lastMInfo.done(RED._("batch.too-many"));
                    node.pending.forEach(e => e.done());
                    node.pending = [];
                    node.pending_count = 0;
                }
            });
            this.on("close", function() {
                if (timer !== undefined) {
                    clearInterval(timer);
                }
                node.pending.forEach(e => e.done());
                node.pending = [];
                node.pending_count = 0;
            });
        }
        else if(mode === "concat") {
            node.topics = (n.topics || []).map(function(x) {
                return x.topic;
            });
            node.pending = {};
            this.on("input", function(msg, send, done) {
                if (msg.hasOwnProperty("reset")) {
                    Object.values(node.pending).forEach(p_topic => {
                        Object.values(p_topic.groups).forEach(group => {
                            group.msgs.forEach(e => e.done());
                        });
                    });
                    node.pending = {};
                    node.pending_count = 0;
                    done();
                    return;
                }
                concat_msg(node, msg, send, done);
            });
            this.on("close", function() {
                Object.values(node.pending).forEach(p_topic => {
                    Object.values(p_topic.groups).forEach(group => {
                        group.msgs.forEach(e => e.done());
                    });
                });
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
