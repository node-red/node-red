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

    const crypto = require("crypto");

    function LinkInNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var event = "node:"+n.id;
        var handler = function(msg) {
            msg._event = n.event;
            node.receive(msg);
        }
        RED.events.on(event,handler);
        this.on("input", function(msg, send, done) {
            send(msg);
            done();
        });
        this.on("close",function() {
            RED.events.removeListener(event,handler);
        });
    }

    RED.nodes.registerType("link in",LinkInNode);

    function LinkOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var mode = n.mode || "link";

        var event = "node:"+n.id;
        this.on("input", function(msg, send, done) {
            msg._event = event;
            RED.events.emit(event,msg)

            if (mode === "return") {
                if (Array.isArray(msg._linkSource) && msg._linkSource.length > 0) {
                    var messageEvent = msg._linkSource.pop();
                    var returnNode = RED.nodes.getNode(messageEvent.node);
                    if (returnNode && returnNode.returnLinkMessage) {
                        returnNode.returnLinkMessage(messageEvent.id, msg);
                    } else {
                        node.warn(RED._("link.error.missingReturn"))
                    }
                } else {
                    node.warn(RED._("link.error.missingReturn"))
                }
                done();
            } else if (mode === "link") {
                send(msg);
                done();
            }
        });
    }
    RED.nodes.registerType("link out",LinkOutNode);


    function LinkCallNode(n) {
        RED.nodes.createNode(this,n);
        const node = this;
        const target = n.links[0];
        const messageEvents = {};
        let timeout = parseFloat(n.timeout || "30")*1000;
        if (isNaN(timeout)) {
            timeout = 30000;
        }

        this.on("input", function(msg, send, done) {
            msg._linkSource = msg._linkSource || [];
            const messageEvent = {
                id: crypto.randomBytes(14).toString('hex'),
                node: node.id,
            }
            messageEvents[messageEvent.id] = {
                msg: RED.util.cloneMessage(msg),
                send,
                done,
                ts: setTimeout(function() {
                    timeoutMessage(messageEvent.id)
                }, timeout )
            };
            msg._linkSource.push(messageEvent);
            var targetNode = RED.nodes.getNode(target);
            if (targetNode) {
                targetNode.receive(msg);
            }
        });

        this.returnLinkMessage = function(eventId, msg) {
            if (Array.isArray(msg._linkSource) && msg._linkSource.length === 0) {
                delete msg._linkSource;
            }
            const messageEvent = messageEvents[eventId];
            if (messageEvent) {
                clearTimeout(messageEvent.ts);
                delete messageEvents[eventId];
                messageEvent.send(msg);
                messageEvent.done();
            } else {
                node.send(msg);
            }
        }

        function timeoutMessage(eventId) {
            const messageEvent = messageEvents[eventId];
            if (messageEvent) {
                delete messageEvents[eventId];
                node.error("timeout",messageEvent.msg);
            }
        }

    }
    RED.nodes.registerType("link call",LinkCallNode);


}
