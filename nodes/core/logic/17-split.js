/**
 * Copyright 2016 IBM Corp.
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
        this.splt = n.splt || "";
        this.split = new RegExp(this.splt);
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                var a = msg.payload;
                if (msg.hasOwnProperty("parts")) { msg.parts = { parts:msg.parts }; } // push existing parts to a stack
                else { msg.parts = {}; }
                msg.parts.id = msg._msgid;  // use the existing _msgid by default.
                if (typeof msg.payload === "string") { // Split String into array
                    a = msg.payload.split(node.split);
                    msg.parts.ch = node.splt; // pass the split char to other end for rejoin
                    msg.parts.type = "string";
                }
                if (Array.isArray(a)) { // then split array into messages
                    msg.parts.type = msg.parts.type || "array";  // if it wasn't a string in the first place
                    for (var i = 0; i < a.length; i++) {
                        msg.payload = a[i];
                        msg.parts.index = i;
                        msg.parts.count = a.length;
                        node.send(msg);
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
                            node.send(msg);
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
        this.timer = Number(n.timeout || 0);
        this.timerr = n.timerr || "send";
        this.count = Number(n.count || 0);
        this.joiner = n.joiner;
        this.build = n.build || "array";
        var node = this;
        var inflight = {};
        var misc = (this.build === "array") ? [] : {};
        var tout;

        function isObject (item) {
            return (typeof item === "object" && !Array.isArray(item)&& ! Buffer.isBuffer(item) && item !== null);
        }

        // if array came from a string then reassemble it and send it
        var sendIt = function(m) {
            if (inflight[m.parts.id].ch !== undefined) { // if it was a string - rejoin it using the split char
                var jc = (node.joiner || inflight[m.parts.id].ch).replace(/\\n/,"\n").replace(/\\r/,"\r").replace(/\\t/,"\t").replace(/\\e/,"\e").replace(/\\f/,"\c").replace(/\\0/,"\0");
                m.payload = inflight[m.parts.id].a.join(jc);
            } else { // leave it as an array
                m.payload = inflight[m.parts.id].a;
            }
            m._msgid = m.parts.id;
            clearTimeout(inflight[m.parts.id].timeout); // unset any timer
            delete inflight[m.parts.id];    // remove from the keep track object
            if (m.parts.hasOwnProperty("parts")) {
                m.parts = m.parts.parts;    // pop existing parts
            }
            else { delete m.parts; }        // remove the parts flags
            node.send(m);
        }

        // check all elements of the array are strings (or claim to be).
        var onlyString = function(a) {  // check if the array is all strings
            for (var i = 0; i < a.length; i++) {
                if (typeof a[i] !== "string") { return false; }
            }
            return true;
        }

        // send array of misc message that arrived. (convert to string if all were strings and need joining)
        var sendMisc = function(m) {
            if (tout) { clearTimeout(tout); tout = null; }
            m.payload = misc;
            if (node.joiner && onlyString(misc)) { // if the array is all strings and there is a join char set
                m.payload = misc.join(node.joiner.replace(/\\n/,"\n").replace(/\\r/,"\r").replace(/\\t/,"\t").replace(/\\e/,"\e").replace(/\\f/,"\c").replace(/\\0/,"\0"));
            }
            if (node.build === "array") { misc = []; }
            if (node.build === "object") { misc = {}; }
            node.send(m);
        }

        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                if (msg.hasOwnProperty("parts")) { // only act if it has parts
                    var count = node.count || msg.parts.count || 1;
                    if (msg.parts.hasOwnProperty("index")) { // it's a numbered part (from a split node)
                        if (!inflight[msg.parts.id]) { // New message - create new empty array of correct size
                            if (msg.parts.type === "object") {
                                inflight[msg.parts.id] = {i:0, a:{}, c:msg.parts.count, ch:msg.parts.ch, t:msg.parts.type};
                            } else { // it's an array or string
                                inflight[msg.parts.id] = {i:0, a:new Array(msg.parts.count), ch:msg.parts.ch, t:msg.parts.type};
                            }
                            if (node.timer !== 0) { // If there is a timer to set start it now
                                inflight[msg.parts.id].timeout = setTimeout(function() {
                                    if (node.timerr === "send") { sendIt(msg); }
                                    if (node.timerr === "error") { node.error("Incomplete",msg); }
                                    delete inflight[msg.parts.id];
                                }, node.timer);
                            }
                        }
                        if (msg.parts.type === "object") {
                            inflight[msg.parts.id].a[msg.parts.key] = msg.payload; // Add to the tracking array
                            inflight[msg.parts.id].i = Object.keys(inflight[msg.parts.id].a).length;
                        } else { // it's an array or string
                            inflight[msg.parts.id].a[msg.parts.index] = msg.payload; // Add to the tracking array
                            inflight[msg.parts.id].i += 1;                         // Increment the count
                        }
                        if (inflight[msg.parts.id].i >= count) { sendIt(msg); } // All arrived - send
                    } // otherwise ignore it
                    if (msg.hasOwnProperty("complete")) { // if set then send right away anyway...
                        delete(msg.complete);
                        sendIt(msg);
                    }
                }

                // The case for any messages arriving without parts - ie random messages you want to join.
                else {
                    var l;
                    if (node.build === "array") {   // simple case of build the array
                        misc.push(msg.payload);     // Add the payload to an array
                        l = misc.length;
                    } else {  // OK so let's build an object
                        if ((msg.key === undefined) && ((msg.topic === undefined) || (msg.topic === ''))) {
                            if (isObject(msg.payload)) {  // if it's already an object (and no topic or key) just append it
                                misc = Object.assign(misc,msg.payload);
                                l = Object.keys(misc).length;
                            }
                            else { // if no topic or key and not an object then warn and drop it.
                                node.warn("key or topic not defined");
                                return;
                            }
                        }
                        else { // if it's got a msg.key or msg.topic then use key||topic as the property name 
                            misc[ msg.key || msg.topic ] = msg.payload;
                            //if (msg.topic) { msg.topic = (msg.topic.split('/')).slice(0,-1).join('/'); }
                            l = Object.keys(misc).length;
                        }
                    }
                    if (l >= node.count) { sendMisc(msg); } // if it's long enough send it
                    else if (msg.hasOwnProperty("complete")) { // if set then send right away anyway...
                        delete(msg.complete);
                        sendMisc(msg);
                    }
                    else if ((node.timer !== 0) && !tout) { // if not start the timer if there is one.
                        tout = setTimeout(function() {
                            if (node.timerr === "send") { sendMisc(msg); }
                            if (node.timerr === "error") { node.error("Timeout",msg); }
                            if (node.build === "array") { misc = []; }
                            if (node.build === "object") { misc = {}; }
                        }, node.timer);
                    }
                }
            }
        });

        this.on("close", function() {
            if (tout) { clearTimeout(tout); }
            for (var i in inflight) {
                if (inflight[i].timeout) { clearTimeout(inflight[i].timeout); }
            }
        });
    }
    RED.nodes.registerType("join",JoinNode);
}
