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

    function SplitNode(n) {
        RED.nodes.createNode(this,n);
        this.splt = (n.splt || "\\n").replace(/\\n/,"\n").replace(/\\r/,"\r").replace(/\\t/,"\t").replace(/\\e/,"\e").replace(/\\f/,"\f").replace(/\\0/,"\0");
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                var a = msg.payload;
                if (msg.hasOwnProperty("parts")) { msg.parts = { parts:msg.parts }; } // push existing parts to a stack
                else { msg.parts = {}; }
                msg.parts.id = msg._msgid;  // use the existing _msgid by default.
                if (typeof msg.payload === "string") { // Split String into array
                    a = msg.payload.split(node.splt);
                    msg.parts.ch = node.splt; // pass the split char to other end for rejoin
                    msg.parts.type = "string";
                }
                if (Array.isArray(a)) { // then split array into messages
                    msg.parts.type = msg.parts.type || "array";  // if it wasn't a string in the first place
                    for (var i = 0; i < a.length; i++) {
                        msg.payload = a[i];
                        msg.parts.index = i;
                        msg.parts.count = a.length;
                        node.send(RED.util.cloneMessage(msg));
                    }
                }
                else if ((typeof msg.payload === "object") && !Buffer.isBuffer(msg.payload)) {
                    var j = 0;
                    var l = Object.keys(msg.payload).length;
                    var pay = msg.payload;
                    msg.parts.type = "object";
                    for (var p in pay) {
                        if (pay.hasOwnProperty(p)) {
                            msg.payload = pay[p];
                            msg.parts.key = p;
                            msg.parts.index = j;
                            msg.parts.count = l;
                            node.send(RED.util.cloneMessage(msg));
                            j += 1;
                        }
                    }
                }
                // TODO not handling Buffers at present...
                //else {  }   // otherwise drop the message.
            }
        });
    }
    RED.nodes.registerType("split",SplitNode);


    function JoinNode(n) {
        RED.nodes.createNode(this,n);
        this.mode = n.mode||"auto";
        this.property = n.property||"payload";
        this.propertyType = n.propertyType||"msg";
        if (this.propertyType === 'full') {
            this.property = "payload";
        }
        this.key = n.key||"topic";
        this.timer = (this.mode === "auto") ? 0 : Number(n.timeout || 0)*1000;
        this.timerr = n.timerr || "send";
        this.count = Number(n.count || 0);
        this.joiner = (n.joiner||"").replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\\t/g,"\t").replace(/\\e/g,"\e").replace(/\\f/g,"\f").replace(/\\0/g,"\0");
        this.build = n.build || "array";
        var node = this;
        var inflight = {};

        var completeSend = function(partId) {
            var group = inflight[partId];
            clearTimeout(group.timeout);
            delete inflight[partId];

            if (group.type === 'string') {
                RED.util.setMessageProperty(group.msg,node.property,group.payload.join(group.joinChar));
            } else {
                RED.util.setMessageProperty(group.msg,node.property,group.payload);
            }
            if (group.msg.hasOwnProperty('parts') && group.msg.parts.hasOwnProperty('parts')) {
                group.msg.parts = group.msg.parts.parts;
            } else {
                delete group.msg.parts;
            }
            node.send(group.msg);
        }

        this.on("input", function(msg) {
try {
            var property;
            if (node.mode === 'auto' && (!msg.hasOwnProperty("parts")||!msg.parts.hasOwnProperty("id"))) {
                node.warn("Message missing msg.parts property - cannot join in 'auto' mode")
                return;
            }
            if (node.propertyType == "full") {
                property = msg;
            } else {
                try {
                    property = RED.util.getMessageProperty(msg,node.property);
                } catch(err) {
                    node.warn("Message property "+node.property+" not found");
                    return;
                }
            }

            var partId;
            var payloadType;
            var propertyKey;
            var targetCount;
            var joinChar;
            var propertyIndex;
            if (node.mode === "auto") {
                // Use msg.parts to identify all of the group information
                partId = msg.parts.id;
                payloadType = msg.parts.type;
                targetCount = msg.parts.count;
                joinChar = msg.parts.ch;
                propertyKey = msg.parts.key;
                propertyIndex = msg.parts.index;
            } else {
                // Use the node configuration to identify all of the group information
                partId = "_";
                payloadType = node.build;
                targetCount = node.count;
                joinChar = node.joiner;
                if (targetCount === 0 && msg.hasOwnProperty('parts')) {
                    targetCount = msg.parts.count || 0;
                }
                if (node.build === 'object') {
                    propertyKey = RED.util.getMessageProperty(msg,node.key);
                }
            }
            if (payloadType === 'object' && (propertyKey === null || propertyKey === undefined || propertyKey === "")) {
                if (node.mode === "auto") {
                    node.warn("Message missing 'msg.parts.key' property - cannot add to object");
                } else {
                    node.warn("Message missing key property 'msg."+node.key+"' '- cannot add to object")
                }
                return;
            }
            if (!inflight.hasOwnProperty(partId)) {
                if (payloadType === 'object' || payloadType === 'merged') {
                    inflight[partId] = {
                        currentCount:0,
                        payload:{},
                        targetCount:targetCount,
                        type:"object",
                        msg:msg
                    };
                } else {
                    inflight[partId] = {
                        currentCount:0,
                        payload:[],
                        targetCount:targetCount,
                        type:payloadType,
                        joinChar: joinChar,
                        msg:msg
                    };
                    if (payloadType === 'string') {
                        inflight[partId].joinChar = joinChar;
                    }
                }
                if (node.timer > 0) {
                    inflight[partId].timeout = setTimeout(function() {
                        completeSend(partId)
                    }, node.timer)
                }
            }

            var group = inflight[partId];
            if (payloadType === 'object') {
                group.payload[propertyKey] = property;
                group.currentCount = Object.keys(group.payload).length;
            } else if (payloadType === 'merged') {
                if (Array.isArray(property) || typeof property !== 'object') {
                    node.warn("Cannot merge non-object types");
                } else {
                    for (propertyKey in property) {
                        if (property.hasOwnProperty(propertyKey)) {
                            group.payload[propertyKey] = property[propertyKey];
                        }
                    }
                    group.currentCount++;
                }
            } else {
                if (!isNaN(propertyIndex)) {
                    group.payload[propertyIndex] = property;
                } else {
                    group.payload.push(property);
                }
                group.currentCount++;
            }
            // TODO: currently reuse the last received - add option to pick first received
            group.msg = msg;
            if (group.currentCount === group.targetCount || msg.hasOwnProperty('complete')) {
                delete msg.complete;
                completeSend(partId);
            }
} catch(err) {
    console.log(err.stack);
}
        });

        this.on("close", function() {
            for (var i in inflight) {
                if (inflight.hasOwnProperty(i)) {
                    clearTimeout(inflight[i].timeout);
                }
            }
        });
    }
    RED.nodes.registerType("join",JoinNode);
}
