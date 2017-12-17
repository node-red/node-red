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

    function send_msgs(node, msgs) {
        var count = msgs.length;
        var msg_id = msgs[0]._msgid;
        for(var i = 0; i < count; i++) {
            var msg = RED.util.cloneMessage(msgs[i]);
            msg.parts = {
                id: msg_id,
                index: i,
                count:count
            };
            node.send(msg);
        }
    }
    
    function BatchNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var context = node.context();
        var mode = n.mode || "count";

        if(mode === "count") {
            var count = Number(n.count || 1);
            var overwrap = Number(n.overwrap || 0);
            var interval = count -overwrap;
            var q_next = 0;
            var queue = [];
            this.on("input", function(msg) {
                if(q_next == 0) {
                    queue.push([]);
                    q_next = interval;
                }
                var new_queue = [];
                let len = queue.length;
                for(var i = 0; i < len; i++) {
                    var msgs = queue.shift();
                    msgs.push(msg);
                    if(msgs.length == count) {
                        send_msgs(node, msgs);
                    }
                    else {
                        new_queue.push(msgs);
                    }
                }
                q_next--;
                queue = new_queue;
            });
        }
        else if(mode === "interval") {
            var msgs = [];
            var interval = Number(n.interval || 1) *1000;
            this.on("input", function(msg) {
                msgs.push(msg);
            });
            setInterval(function() {
                if(msgs.length > 0) {
                    send_msgs(node, msgs);
                    msgs = [];
                }
            }, interval);
        }
        else {
            node.error("unexpected mode");
        }
    }
    RED.nodes.registerType("batch", BatchNode);
}
