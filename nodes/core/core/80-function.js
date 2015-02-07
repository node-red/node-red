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

    function FunctionNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.func = n.func;
        var functionText = "var results = null; results = (function(msg){\n"+this.func+"\n})(msg);";
        this.topic = n.topic;
        var sandbox = {
            console:console,
            util:util,
            Buffer:Buffer,
            context: {
                global:RED.settings.functionGlobalContext || {}
            }
        };
        var context = vm.createContext(sandbox);
        try {
            this.script = vm.createScript(functionText);
            this.on("input", function(msg) {
                try {
                    var start = process.hrtime();
                    context.msg = msg;
                    this.script.runInContext(context);
                    var results = context.results;
                    if (results == null) {
                        results = [];
                    } else if (results.length == null) {
                        results = [results];
                    }
                    if (msg._topic) {
                        for (var m in results) {
                            if (results[m]) {
                                if (util.isArray(results[m])) {
                                    for (var n=0; n < results[m].length; n++) {
                                        results[m][n]._topic = msg._topic;
                                    }
                                } else {
                                    results[m]._topic = msg._topic;
                                }
                            }
                        }
                    }
                    this.send(results);
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
                    this.error(errorMessage);
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
