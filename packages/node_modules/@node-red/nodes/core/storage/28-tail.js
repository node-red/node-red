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
    var plat = require('os').platform();

    if (plat.match(/^win/)) {
        throw RED._("tail.errors.windowsnotsupport");
    }

    function TailNode(n) {
        RED.nodes.createNode(this,n);

        this.filename = n.filename;
        this.filetype = n.filetype || "text";
        this.split = n.split || false;
        var node = this;

        var err = "";
        // TODO: rewrite to use node-tail
        var tail = spawn("tail", ["-F", "-n", "0", this.filename]);
        tail.stdout.on("data", function (data) {
            var msg = { topic:node.filename };
            if (node.filetype === "text") {
                if (node.split) {
                    // TODO: allow customisation of the line break - as we do elsewhere
                    var strings = data.toString().split("\n");
                    for (var s in strings) {
                        //TODO: should we really filter blanks? Is that expected?
                        if (strings[s] !== "") {
                            node.send({
                                topic: node.filename,
                                payload: strings[s]
                            });
                        }
                    }
                }
                else {
                    msg.payload = data.toString();
                    node.send(msg);
                }
            }
            else {
                msg.payload = data;
                node.send(msg);
            }
        });

        tail.stderr.on("data", function(data) {
            node.error(data.toString());
        });

        this.on("close", function() {
            /* istanbul ignore else */
            if (tail) { tail.kill(); }
        });
    }

    RED.nodes.registerType("tail",TailNode);
}
