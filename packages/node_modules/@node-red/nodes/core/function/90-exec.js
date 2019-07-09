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
    var spawn = require('child_process').spawn;
    var exec = require('child_process').exec;
    var isUtf8 = require('is-utf8');

    function ExecNode(n) {
        RED.nodes.createNode(this,n);
        this.cmd = (n.command || "").trim();
        if (n.addpay === undefined) { n.addpay = true; }
        this.addpay = n.addpay;
        this.append = (n.append || "").trim();
        this.useSpawn = (n.useSpawn == "true");
        this.timer = Number(n.timer || 0)*1000;
        this.activeProcesses = {};
        this.oldrc = (n.oldrc || false).toString();
        var node = this;

        var cleanup = function(p) {
            node.activeProcesses[p].kill();
            //node.status({fill:"red",shape:"dot",text:"timeout"});
            //node.error("Exec node timeout");
        }

        this.on("input", function(msg, nodeSend, nodeDone) {
            if (msg.hasOwnProperty("kill")) {
                if (typeof msg.kill !== "string" || msg.kill.length === 0 || !msg.kill.toUpperCase().startsWith("SIG") ) { msg.kill = "SIGTERM"; }
                if (msg.hasOwnProperty("pid")) {
                    if (node.activeProcesses.hasOwnProperty(msg.pid) ) {
                        node.activeProcesses[msg.pid].kill(msg.kill.toUpperCase());
                        node.status({fill:"red",shape:"dot",text:"killed"});
                    }
                }
                else {
                    if (Object.keys(node.activeProcesses).length === 1) {
                        node.activeProcesses[Object.keys(node.activeProcesses)[0]].kill(msg.kill.toUpperCase());
                        node.status({fill:"red",shape:"dot",text:"killed"});
                    }
                }
                nodeDone();
            }
            else {
                var child;
                if (this.useSpawn === true) {
                    // make the extra args into an array
                    // then prepend with the msg.payload
                    var arg = node.cmd;
                    if ((node.addpay === true) && msg.hasOwnProperty("payload")) { arg += " "+msg.payload; }
                    if (node.append.trim() !== "") { arg += " "+node.append; }
                    // slice whole line by spaces and removes any quotes since spawn can't handle them
                    arg = arg.match(/(?:[^\s"]+|"[^"]*")+/g).map((a) => {
                        if (/^".*"$/.test(a)) {
                            return a.slice(1,-1)
                        } else {
                            return a
                        }
                    });
                    var cmd = arg.shift();
                    /* istanbul ignore else  */
                    if (RED.settings.verbose) { node.log(cmd+" ["+arg+"]"); }
                    child = spawn(cmd,arg);
                    node.status({fill:"blue",shape:"dot",text:"pid:"+child.pid});
                    var unknownCommand = (child.pid === undefined);
                    if (node.timer !== 0) {
                        child.tout = setTimeout(function() { cleanup(child.pid); }, node.timer);
                    }
                    node.activeProcesses[child.pid] = child;
                    child.stdout.on('data', function (data) {
                        if (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null) {
                            // console.log('[exec] stdout: ' + data,child.pid);
                            if (isUtf8(data)) { msg.payload = data.toString(); }
                            else { msg.payload = data; }
                            nodeSend([RED.util.cloneMessage(msg),null,null]);
                        }
                    });
                    child.stderr.on('data', function (data) {
                        if (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null) {
                            if (isUtf8(data)) { msg.payload = data.toString(); }
                            else { msg.payload = Buffer.from(data); }
                            nodeSend([null,RED.util.cloneMessage(msg),null]);
                        }
                    });
                    child.on('close', function (code,signal) {
                        if (unknownCommand || (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null)) {
                            delete node.activeProcesses[child.pid];
                            if (child.tout) { clearTimeout(child.tout); }
                            msg.payload = code;
                            if (node.oldrc === "false") {
                                msg.payload = {code:code};
                                if (signal) { msg.payload.signal = signal; }
                            }
                            if (code === 0) { node.status({}); }
                            if (code === null) { node.status({fill:"red",shape:"dot",text:"killed"}); }
                            else if (code < 0) { node.status({fill:"red",shape:"dot",text:"rc:"+code}); }
                            else { node.status({fill:"yellow",shape:"dot",text:"rc:"+code}); }
                            nodeSend([null,null,RED.util.cloneMessage(msg)]);
                        }
                        nodeDone();
                    });
                    child.on('error', function (code) {
                        if (child.tout) { clearTimeout(child.tout); }
                        delete node.activeProcesses[child.pid];
                        if (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null) {
                            node.error(code,RED.util.cloneMessage(msg));
                        }
                    });
                }
                else {
                    var cl = node.cmd;
                    if ((node.addpay === true) && msg.hasOwnProperty("payload")) { cl += " "+msg.payload; }
                    if (node.append.trim() !== "") { cl += " "+node.append; }
                    /* istanbul ignore else  */
                    if (RED.settings.verbose) { node.log(cl); }
                    child = exec(cl, {encoding:'binary', maxBuffer:10000000}, function (error, stdout, stderr) {
                        var msg2, msg3;
                        delete msg.payload;
                        if (stderr) {
                            msg2 = RED.util.cloneMessage(msg);
                            msg2.payload = stderr;
                        }
                        msg.payload = Buffer.from(stdout,"binary");
                        if (isUtf8(msg.payload)) { msg.payload = msg.payload.toString(); }
                        node.status({});
                        //console.log('[exec] stdout: ' + stdout);
                        //console.log('[exec] stderr: ' + stderr);
                        if (error !== null) {
                            msg3 = RED.util.cloneMessage(msg);
                            msg3.payload = {code:error.code, message:error.message};
                            if (error.signal) { msg3.payload.signal = error.signal; }
                            if (error.code === null) { node.status({fill:"red",shape:"dot",text:"killed"}); }
                            else { node.status({fill:"red",shape:"dot",text:"error:"+error.code}); }
                            node.log('error:' + error);
                        }
                        else if (node.oldrc === "false") {
                            msg3 = RED.util.cloneMessage(msg);
                            msg3.payload = {code:0};
                        }
                        if (!msg3) { node.status({}); }
                        else {
                            msg.rc = msg3.payload;
                            if (msg2) { msg2.rc = msg3.payload; }
                        }
                        nodeSend([msg,msg2,msg3]);
                        if (child.tout) { clearTimeout(child.tout); }
                        delete node.activeProcesses[child.pid];
                        nodeDone();
                    });
                    node.status({fill:"blue",shape:"dot",text:"pid:"+child.pid});
                    child.on('error',function() {});
                    if (node.timer !== 0) {
                        child.tout = setTimeout(function() { cleanup(child.pid); }, node.timer);
                    }
                    node.activeProcesses[child.pid] = child;
                }
            }
        });

        this.on('close',function() {
            for (var pid in node.activeProcesses) {
                /* istanbul ignore else  */
                if (node.activeProcesses.hasOwnProperty(pid)) {
                    if (node.activeProcesses[pid].tout) { clearTimeout(node.activeProcesses[pid].tout); }
                    // console.log("KILLING",pid);
                    var process = node.activeProcesses[pid];
                    node.activeProcesses[pid] = null;
                    process.kill();
                }
            }
            node.activeProcesses = {};
            node.status({});
        });
    }
    RED.nodes.registerType("exec",ExecNode);
}
