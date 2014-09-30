/**
 * Copyright 2013,2014 IBM Corp.
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
    var fs = require("fs");

    function SplitNode(n) {
        RED.nodes.createNode(this,n);

        this.sep = n.sep || "\n" ;
        this.limit = n.limit;
        this.array = n.array;
        var node = this;
        this.on('input', function(msg) {
            var lines;
            if (msg.payload instanceof Array)  {
                var arr = msg.payload;
                arr.forEach(function(split) {
                    msg.payload = split;
                    node.send(msg);
                });
            } else {
                if (node.limit) {
                    lines = msg.payload.split(new RegExp(node.sep), node.limit);
                } else {
                    lines = msg.payload.split(new RegExp(node.sep));
                }

                if (node.array) {
                    msg.payload = lines;
                    node.send(msg);
                } else {
                    lines.forEach(function(line) {
                        msg.payload = line;
                        node.send(msg);
                    });
                }
            }
        });
    }
    RED.nodes.registerType("split",SplitNode);
}
