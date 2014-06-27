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

module.exports = function(RED) {
    "use strict";
    var fs = require("fs");
    var spawn = require('child_process').spawn;

    function TailNode(n) {
        RED.nodes.createNode(this,n);

        this.filename = n.filename;
        this.split = n.split;
        var node = this;

        var err = "";
        var tail = spawn("tail", ["-f", this.filename]);
        tail.stdout.on("data", function (data) {
            var msg = {topic:node.filename};
            if (node.split) {
                var strings = data.toString().split("\n");
                for (var s in strings) {
                    if (strings[s] != "") {
                        msg.payload = strings[s];
                        node.send(msg);
                    }
                }
            }
            else {
                msg.payload = data.toString();
                node.send(msg);
            }
        });

        tail.stderr.on("data", function(data) {
            node.warn(data.toString());
        });

        this.on("close", function() {
            if (tail) tail.kill();
        });
    }

    RED.nodes.registerType("tail",TailNode);
}
