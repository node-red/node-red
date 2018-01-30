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

    function sendArray(node,msg,array) {
        for (var i = 0; i < array.length-1; i++) {
            msg.payload = array[i];
            msg.parts.index = node.c++;
            if (node.stream !== true) { msg.parts.count = array.length; }
            node.send(RED.util.cloneMessage(msg));
        }
        if (node.stream !== true) {
            msg.payload = array[i];
            msg.parts.index = node.c++;
            msg.parts.count = array.length;
            node.send(RED.util.cloneMessage(msg));
            node.c = 0;
        }
        else { node.remainder = array[i]; }
    }

    function SplitNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        node.stream = n.stream;
        node.spltType = n.spltType || "str";
        node.addname = n.addname || "";
        try {
            if (node.spltType === "str") {
                this.splt = (n.splt || "\\n").replace(/\\n/,"\n").replace(/\\r/,"\r").replace(/\\t/,"\t").replace(/\\e/,"\e").replace(/\\f/,"\f").replace(/\\0/,"\0");
            } else if (node.spltType === "bin") {
                var spltArray = JSON.parse(n.splt);
                if (Array.isArray(spltArray)) {
                    this.splt = Buffer.from(spltArray);
                } else {
                    throw new Error("not an array");
                }
                this.spltBuffer = spltArray;
            } else if (node.spltType === "len") {
                this.splt = parseInt(n.splt);
                if (isNaN(this.splt) || this.splt < 1) {
                    throw new Error("invalid split length: "+n.splt);
                }
            }
            this.arraySplt = (n.arraySplt === undefined)?1:parseInt(n.arraySplt);
            if (isNaN(this.arraySplt) || this.arraySplt < 1) {
                throw new Error("invalid array split length: "+n.arraySplt);
            }
        } catch(err) {
            this.error("Invalid split property: "+err.toString());
            return;
        }
        node.c = 0;
        node.buffer = Buffer.from([]);
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                if (msg.hasOwnProperty("parts")) { msg.parts = { parts:msg.parts }; } // push existing parts to a stack
                else { msg.parts = {}; }
                msg.parts.id = RED.util.generateId();  // generate a random id
                delete msg._msgid;
                if (typeof msg.payload === "string") { // Split String into array
                    msg.payload = (node.remainder || "") + msg.payload;
                    msg.parts.type = "string";
                    if (node.spltType === "len") {
                        msg.parts.ch = "";
                        msg.parts.len = node.splt;
                        var count = msg.payload.length/node.splt;
                        if (Math.floor(count) !== count) {
                            count = Math.ceil(count);
                        }
                        if (node.stream !== true) {
                            msg.parts.count = count;
                            node.c = 0;
                        }
                        var pos = 0;
                        var data = msg.payload;
                        for (var i=0; i<count-1; i++) {
                            msg.payload = data.substring(pos,pos+node.splt);
                            msg.parts.index = node.c++;
                            pos += node.splt;
                            node.send(RED.util.cloneMessage(msg));
                        }
                        node.remainder = data.substring(pos);
                        if ((node.stream !== true) || (node.remainder.length === node.splt)) {
                            msg.payload = node.remainder;
                            msg.parts.index = node.c++;
                            node.send(RED.util.cloneMessage(msg));
                            node.remainder = "";
                        }
                    }
                    else {
                        var a = [];
                        if (node.spltType === "bin") {
                            if (!node.spltBufferString) {
                                node.spltBufferString = node.splt.toString();
                            }
                            a = msg.payload.split(node.spltBufferString);
                            msg.parts.ch = node.spltBuffer; // pass the split char to other end for rejoin
                        } else if (node.spltType === "str") {
                            a = msg.payload.split(node.splt);
                            msg.parts.ch = node.splt; // pass the split char to other end for rejoin
                        }
                        sendArray(node,msg,a);
                    }
                }
                else if (Array.isArray(msg.payload)) { // then split array into messages
                    msg.parts.type = "array";
                    var count = msg.payload.length/node.arraySplt;
                    if (Math.floor(count) !== count) {
                        count = Math.ceil(count);
                    }
                    msg.parts.count = count;
                    var pos = 0;
                    var data = msg.payload;
                    msg.parts.len = node.arraySplt;
                    for (var i=0; i<count; i++) {
                        msg.payload = data.slice(pos,pos+node.arraySplt);
                        if (node.arraySplt === 1) {
                            msg.payload = msg.payload[0];
                        }
                        msg.parts.index = i;
                        pos += node.arraySplt;
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
                            if (node.addname !== "") {
                                msg[node.addname] = p;
                            }
                            msg.parts.key = p;
                            msg.parts.index = j;
                            msg.parts.count = l;
                            node.send(RED.util.cloneMessage(msg));
                            j += 1;
                        }
                    }
                }
                else if (Buffer.isBuffer(msg.payload)) {
                    var len = node.buffer.length + msg.payload.length;
                    var buff = Buffer.concat([node.buffer, msg.payload], len);
                    msg.parts.type = "buffer";
                    if (node.spltType === "len") {
                        var count = buff.length/node.splt;
                        if (Math.floor(count) !== count) {
                            count = Math.ceil(count);
                        }
                        if (node.stream !== true) {
                            msg.parts.count = count;
                            node.c = 0;
                        }
                        var pos = 0;
                        msg.parts.len = node.splt;
                        for (var i=0; i<count-1; i++) {
                            msg.payload = buff.slice(pos,pos+node.splt);
                            msg.parts.index = node.c++;
                            pos += node.splt;
                            node.send(RED.util.cloneMessage(msg));
                        }
                        node.buffer = buff.slice(pos);
                        if ((node.stream !== true) || (node.buffer.length === node.splt)) {
                            msg.payload = node.buffer;
                            msg.parts.index = node.c++;
                            node.send(RED.util.cloneMessage(msg));
                            node.buffer = Buffer.from([]);
                        }
                    }
                    else {
                        var count = 0;
                        if (node.spltType === "bin") {
                            msg.parts.ch = node.spltBuffer;
                        } else if (node.spltType === "str") {
                            msg.parts.ch = node.splt;
                        }
                        var pos = buff.indexOf(node.splt);
                        var end;
                        while (pos > -1) {
                            count++;
                            end = pos+node.splt.length;
                            pos = buff.indexOf(node.splt,end);
                        }
                        count++;
                        if (node.stream !== true) {
                            msg.parts.count = count;
                            node.c = 0;
                        }
                        var i = 0, p = 0;
                        pos = buff.indexOf(node.splt);
                        while (pos > -1) {
                            msg.payload = buff.slice(p,pos);
                            msg.parts.index = node.c++;
                            node.send(RED.util.cloneMessage(msg));
                            i++;
                            p = pos+node.splt.length;
                            pos = buff.indexOf(node.splt,p);
                        }
                        if ((node.stream !== true) && (p < buff.length)) {
                            msg.payload = buff.slice(p,buff.length);
                            msg.parts.index = node.c++;
                            msg.parts.count = node.c++;
                            node.send(RED.util.cloneMessage(msg));
                        }
                        else {
                            node.buffer = buff.slice(p,buff.length);
                        }
                    }
                }
                //else {  }   // otherwise drop the message.
            }
        });
    }
    RED.nodes.registerType("split",SplitNode);


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

    function apply_r(exp, accum, msg, index, count) {
        exp.assign("I", index);
        exp.assign("N", count);
        exp.assign("A", accum);
        return RED.util.evaluateJSONataExpression(exp, msg);
    }

    function apply_f(exp, accum, count) {
        exp.assign("N", count);
        exp.assign("A", accum);
        return RED.util.evaluateJSONataExpression(exp, {});
    }

    function exp_or_undefined(exp) {
        if((exp === "") ||
           (exp === null)) {
            return undefined;
        }
        return exp
    }

    function reduce_and_send_group(node, group) {
        var is_right = node.reduce_right;
        var flag = is_right ? -1 : 1;
        var msgs = group.msgs;
        var accum = eval_exp(node, node.exp_init, node.exp_init_type);
        var reduce_exp = node.reduce_exp;
        var reduce_fixup = node.reduce_fixup;
        var count = group.count;
        msgs.sort(function(x,y) {
            var ix = x.parts.index;
            var iy = y.parts.index;
            if (ix < iy) return -flag;
            if (ix > iy) return flag;
            return 0;
        });
        for(var msg of msgs) {
            accum = apply_r(reduce_exp, accum, msg, msg.parts.index, count);
        }
        if(reduce_fixup !== undefined) {
            accum = apply_f(reduce_fixup, accum, count);
        }
        node.send({payload: accum});
    }

    function reduce_msg(node, msg) {
        if(msg.hasOwnProperty('parts')) {
            var parts = msg.parts;
            var pending = node.pending;
            var pending_count = node.pending_count;
            var gid = msg.parts.id;
            var count;
            if(!pending.hasOwnProperty(gid)) {
                if(parts.hasOwnProperty('count')) {
                    count = msg.parts.count;
                }
                pending[gid] = {
                    count: count,
                    msgs: []
                };
            }
            var group = pending[gid];
            var msgs = group.msgs;
            if(parts.hasOwnProperty('count') &&
               (group.count === undefined)) {
                group.count = count;
            }
            msgs.push(msg);
            pending_count++;
            if(msgs.length === group.count) {
                delete pending[gid];
                try {
                    pending_count -= msgs.length;
                    reduce_and_send_group(node, group);
                } catch(e) {
                    node.error(RED._("join.errors.invalid-expr",{error:e.message}));            }
            }
            node.pending_count = pending_count;
            var max_msgs = max_kept_msgs_count(node);
            if ((max_msgs > 0) && (pending_count > max_msgs)) {
                node.pending = {};
                node.pending_count = 0;
                node.error(RED._("join.too-many"), msg);
            }
        }
        else {
            node.send(msg);
        }
    }

    function eval_exp(node, exp, exp_type) {
        if(exp_type === "flow") {
            return node.context().flow.get(exp);
        }
        else if(exp_type === "global") {
            return node.context().global.get(exp);
        }
        else if(exp_type === "str") {
            return exp;
        }
        else if(exp_type === "num") {
            return Number(exp);
        }
        else if(exp_type === "bool") {
            if (exp === 'true') {
                return true;
            }
            else if (exp === 'false') {
                return false;
            }
        }
        else if ((exp_type === "bin") ||
                 (exp_type === "json")) {
            return JSON.parse(exp);
        }
        else if(exp_type === "date") {
            return Date.now();
        }
        else if(exp_type === "jsonata") {
            var jexp = RED.util.prepareJSONataExpression(exp, node);
            return RED.util.evaluateJSONataExpression(jexp, {});
        }
        throw new Error("unexpected initial value type");
    }

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
        this.count = Number(n.count || 0);
        this.joiner = n.joiner||"";
        this.joinerType = n.joinerType||"str";

        this.reduce = (this.mode === "reduce");
        if (this.reduce) {
            this.exp_init = n.reduceInit;
            this.exp_init_type = n.reduceInitType;
            var exp_reduce = n.reduceExp;
            var exp_fixup = exp_or_undefined(n.reduceFixup);
            this.reduce_right = n.reduceRight;
            try {
                this.reduce_exp = RED.util.prepareJSONataExpression(exp_reduce, this);
                this.reduce_fixup = (exp_fixup !== undefined) ? RED.util.prepareJSONataExpression(exp_fixup, this) : undefined;
            } catch(e) {
                this.error(RED._("join.errors.invalid-expr",{error:e.message}));
            }
        }

        if (this.joinerType === "str") {
            this.joiner = this.joiner.replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\\t/g,"\t").replace(/\\e/g,"\e").replace(/\\f/g,"\f").replace(/\\0/g,"\0");
        } else if (this.joinerType === "bin") {
            var joinArray = JSON.parse(n.joiner)
            if (Array.isArray(joinArray)) {
                this.joiner = Buffer.from(joinArray);
            } else {
                throw new Error("not an array");
            }
        }

        this.build = n.build || "array";
        this.accumulate = n.accumulate || "false";

        this.topics = (n.topics || []).map(function(x) { return x.topic; });
        this.merge_on_change = n.mergeOnChange || false;
        this.topic_counts = undefined;
        this.output = n.output || "stream";
        this.pending = {};
        this.pending_count = 0;

        //this.topic = n.topic;
        var node = this;
        var inflight = {};

        var completeSend = function(partId) {
            var group = inflight[partId];
            clearTimeout(group.timeout);
            if ((node.accumulate !== true) || group.msg.hasOwnProperty("complete")) { delete inflight[partId]; }
            if (group.type === 'array' && group.arrayLen > 1) {
                var newArray = [];
                group.payload.forEach(function(n) {
                    newArray = newArray.concat(n);
                })
                group.payload = newArray;
            } else if (group.type === 'buffer') {
                var buffers = [];
                var bufferLen = 0;
                if (group.joinChar !== undefined) {
                    var joinBuffer = Buffer.from(group.joinChar);
                    for (var i=0; i<group.payload.length; i++) {
                        if (i > 0) {
                            buffers.push(joinBuffer);
                            bufferLen += joinBuffer.length;
                        }
                        buffers.push(group.payload[i]);
                        bufferLen += group.payload[i].length;
                    }
                } else {
                    bufferLen = group.bufferLen;
                    buffers = group.payload;
                }
                group.payload = Buffer.concat(buffers,bufferLen);
            }

            if (group.type === 'string') {
                var groupJoinChar = group.joinChar;
                if (typeof group.joinChar !== 'string') {
                    groupJoinChar = group.joinChar.toString();
                }
                RED.util.setMessageProperty(group.msg,node.property,group.payload.join(groupJoinChar));
            } else {
                if (node.propertyType === 'full') {
                    group.msg = RED.util.cloneMessage(group.msg);
                }
                RED.util.setMessageProperty(group.msg,node.property,group.payload);
            }
            if (group.msg.hasOwnProperty('parts') && group.msg.parts.hasOwnProperty('parts')) {
                group.msg.parts = group.msg.parts.parts;
            } else {
                delete group.msg.parts;
            }
            delete group.msg.complete;
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
                }
                else {
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
                var arrayLen;
                var propertyIndex;
                if (node.mode === "auto") {
                    // Use msg.parts to identify all of the group information
                    partId = msg.parts.id;
                    payloadType = msg.parts.type;
                    targetCount = msg.parts.count;
                    joinChar = msg.parts.ch;
                    propertyKey = msg.parts.key;
                    arrayLen = msg.parts.len;
                    propertyIndex = msg.parts.index;
                }
                else if (node.mode === 'reduce') {
                    reduce_msg(node, msg);
                    return;
                }
                else {
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

                if ((payloadType === 'object') && (propertyKey === null || propertyKey === undefined || propertyKey === "")) {
                    if (node.mode === "auto") {
                        node.warn("Message missing 'msg.parts.key' property - cannot add to object");
                    }
                    else {
                        if (msg.hasOwnProperty('complete')) {
                            completeSend(partId);
                        }
                        else {
                            node.warn("Message missing key property 'msg."+node.key+"' - cannot add to object")
                        }
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
                    }
                    else if (node.accumulate === true) {
                        if (msg.hasOwnProperty("reset")) { delete inflight[partId]; }
                        inflight[partId] = inflight[partId] || {
                            currentCount:0,
                            payload:{},
                            targetCount:targetCount,
                            type:payloadType,
                            msg:msg
                        }
                        if (payloadType === 'string' || payloadType === 'array' || payloadType === 'buffer') {
                            inflight[partId].payload = [];
                        }
                    }
                    else {
                        inflight[partId] = {
                            currentCount:0,
                            payload:[],
                            targetCount:targetCount,
                            type:payloadType,
                            msg:msg
                        };
                        if (payloadType === 'string') {
                            inflight[partId].joinChar = joinChar;
                        } else if (payloadType === 'array') {
                            inflight[partId].arrayLen = arrayLen;
                        } else if (payloadType === 'buffer') {
                            inflight[partId].bufferLen = 0;
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
                if (payloadType === 'buffer') {
                    inflight[partId].bufferLen += property.length;
                }
                if (payloadType === 'object') {
                    group.payload[propertyKey] = property;
                    group.currentCount = Object.keys(group.payload).length;
                    //msg.topic = node.topic || msg.topic;
                } else if (payloadType === 'merged') {
                    if (Array.isArray(property) || typeof property !== 'object') {
                        if (!msg.hasOwnProperty("complete")) {
                            node.warn("Cannot merge non-object types");
                        }
                    } else {
                        for (propertyKey in property) {
                            if (property.hasOwnProperty(propertyKey) && propertyKey !== '_msgid') {
                                group.payload[propertyKey] = property[propertyKey];
                            }
                        }
                        group.currentCount = Object.keys(group.payload).length;
                        //group.currentCount++;
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
                var tcnt = group.targetCount;
                if (msg.hasOwnProperty("parts")) { tcnt = group.targetCount || msg.parts.count; }
                if ((tcnt > 0 && group.currentCount >= tcnt) || msg.hasOwnProperty('complete')) {
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
