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
    var util = require("util");
    var vm = require("vm");

    function sendResults(node,_msgid,msgs) {
        if (msgs == null) {
            return;
        } else if (!util.isArray(msgs)) {
            msgs = [msgs];
        }
        var msgCount = 0;
        for (var m=0;m<msgs.length;m++) {
            if (msgs[m]) {
                if (util.isArray(msgs[m])) {
                    for (var n=0; n < msgs[m].length; n++) {
                        msgs[m][n]._msgid = _msgid;
                        msgCount++;
                    }
                } else {
                    msgs[m]._msgid = _msgid;
                    msgCount++;
                }
            }
        }
        if (msgCount>0) {
            node.send(msgs);
        }
    }

    function FunctionNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.name = n.name;
        this.func = n.func;
        var functionText = "var results = null;"+
                           "results = (function(msg){ "+
                              "var __msgid__ = msg._msgid;"+
                              "var node = {"+
                                 "log:__node__.log,"+
                                 "error:__node__.error,"+
                                 "warn:__node__.warn,"+
                                 "on:__node__.on,"+
                                 "send:function(msgs){ __node__.send(__msgid__,msgs);}"+
                              "};\n"+
                              this.func+"\n"+
                           "})(msg);";
        this.topic = n.topic;
        var sandbox = {
            console:console,
            util:util,
            Buffer:Buffer,
            __node__: {
                log: function() {
                    node.log.apply(node, arguments);
                },
                error: function(){
                    node.error.apply(node, arguments);
                },
                warn: function() {
                    node.warn.apply(node, arguments);
                },
                send: function(id,msgs) {
                    sendResults(node,id,msgs);
                },
                on: function() {
                    node.on.apply(node,arguments);
                }
            },
            context: {
                global:RED.settings.functionGlobalContext || {}
            },
            setTimeout: setTimeout
        };
        var context = vm.createContext(sandbox);
        try {
            this.script = vm.createScript(functionText);
            this.on("input", function(msg) {
                try {
                    var start = process.hrtime();
                    context.msg = msg;
                    this.script.runInContext(context);
                    sendResults(this,msg._msgid,context.results);

                    var duration = process.hrtime(start);
                    var converted = Math.floor((duration[0]* 1e9 +  duration[1])/10000)/100;
                    this.metric("duration", msg, converted);
                    if (process.env.NODE_RED_FUNCTION_TIME) {
                        this.status({fill:"yellow",shape:"dot",text:""+converted});
                    }
                } catch(err) {
                    var errorMessage = err.toString();
                    var stack = err.stack.split(/\r?\n/);
                    if (stack.length > 0) {
                        var m = /at undefined:(\d+):(\d+)$/.exec(stack[1]);
                        if (m) {
                            var line = Number(m[1])-1;
                            var cha = m[2];
                            errorMessage += " (line "+line+", col "+cha+")";
                        }
                    }
                    this.error(errorMessage, msg);
                }
            });
        } catch(err) {
            // eg SyntaxError - which v8 doesn't include line number information
            // so we can't do better than this
            this.error(err);
        }
    }
    RED.nodes.registerType("function",FunctionNode);
    RED.library.register("functions");
}
