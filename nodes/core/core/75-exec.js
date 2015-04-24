/**
 * Copyright 2013,2015 IBM Corp.
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
        this.useSpawn = n.useSpawn;

        var node = this;
        this.on("input", function(msg) {
            node.status({fill:"blue",shape:"dot"});
            if (this.useSpawn === true) {
                // make the extra args into an array
                // then prepend with the msg.payload
                if (typeof(msg.payload !== "string")) { msg.payload = (msg.payload || "").toString(); }
                var arg = [];
                if (node.append.length > 0) { arg = node.append.split(","); }
                if ((node.addpay === true) && (msg.payload.trim() !== "")) { arg.unshift(msg.payload); }
                if (RED.settings.verbose) { node.log(node.cmd+" ["+arg+"]"); }
                if (node.cmd.indexOf(" ") == -1) {
                    var ex = spawn(node.cmd,arg);
                    ex.stdout.on('data', function (data) {
                        //console.log('[exec] stdout: ' + data);
                        if (isUtf8(data)) { msg.payload = data.toString(); }
                        else { msg.payload = data; }
                        node.send([msg,null,null]);
                    });
                    ex.stderr.on('data', function (data) {
                        //console.log('[exec] stderr: ' + data);
                        if (isUtf8(data)) { msg.payload = data.toString(); }
                        else { msg.payload = new Buffer(data); }
                        node.send([null,msg,null]);
                    });
                    ex.on('close', function (code) {
                        //console.log('[exec] result: ' + code);
                        msg.payload = code;
                        node.status({});
                        node.send([null,null,msg]);
                    });
                    ex.on('error', function (code) {
                        node.error(code,msg);
                    });
                }
                else { node.error("Spawn command must be just the command - no spaces or extra parameters"); }
            }
            else {
                var cl = node.cmd;
                if ((node.addpay === true) && ((msg.payload || "").trim() !== "")) { cl += " "+msg.payload; }
                if (node.append.trim() !== "") { cl += " "+node.append; }
                if (RED.settings.verbose) { node.log(cl); }
                var child = exec(cl, {encoding: 'binary', maxBuffer:10000000}, function (error, stdout, stderr) {
                    msg.payload = new Buffer(stdout,"binary");
                    try {
                        if (isUtf8(msg.payload)) { msg.payload = msg.payload.toString(); }
                    } catch(e) {
                        node.log("Bad STDOUT");
                    }
                    var msg2 = {payload:stderr};
                    var msg3 = null;
                    //console.log('[exec] stdout: ' + stdout);
                    //console.log('[exec] stderr: ' + stderr);
                    if (error !== null) {
                        msg3 = {payload:error};
                        //console.log('[exec] error: ' + error);
                    }
                    node.status({});
                    node.send([msg,msg2,msg3]);
                });
            }
        });
    }
    RED.nodes.registerType("exec",ExecNode);
}
