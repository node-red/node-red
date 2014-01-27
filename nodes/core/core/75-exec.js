/**
 * Copyright 2013 IBM Corp.
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

var RED = require(process.env.NODE_RED_HOME+"/red/red");

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

function ExecNode(n) {
    RED.nodes.createNode(this,n);
    this.cmd = n.command;
    this.append = n.append || "";
    this.useSpawn = n.useSpawn;

    var node = this;
    this.on("input", function(msg) {
        if (msg != null) {

            if (this.useSpawn == true) {
                // make the extra args into an array
                // then prepend with the msg.payload
                var arg = node.append.split(",");
                if (msg.payload != " ") { arg.unshift(msg.payload); }
                node.log(node.cmd+" "+arg);
                var ex = spawn(node.cmd,arg);
                ex.stdout.on('data', function (data) {
                    //console.log('[exec] stdout: ' + data);
                    msg.payload = data;
                    node.send([msg,null,null]);
                });
                ex.stderr.on('data', function (data) {
                    //console.log('[exec] stderr: ' + data);
                    msg.payload = data;
                    node.send([null,msg,null]);
                });
                ex.on('close', function (code) {
                    //console.log('[exec] result: ' + code);
                    msg.payload = code;
                    node.send([null,null,msg]);
                });
            }

            else {
                var cl = node.cmd+" "+msg.payload+" "+node.append;
                node.log(cl);
                var child = exec(cl, function (error, stdout, stderr) {
                    msg.payload = stdout;
                    var msg2 = {payload:stderr};
                    //console.log('[exec] stdout: ' + stdout);
                    //console.log('[exec] stderr: ' + stderr);
                    if (error !== null) {
                        var msg3 = {payload:error};
                        //console.log('[exec] error: ' + error);
                    }
                    node.send([msg,msg2,msg3]);
                });
            }
        }

    });
}

RED.nodes.registerType("exec",ExecNode);
