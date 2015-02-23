/**
 * Copyright 2014 IBM Corp.
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

    function JSONNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                if (typeof msg.payload === "string") {
                    try {
                        msg.payload = JSON.parse(msg.payload);
                        node.send(msg);
                    }
                    catch(e) { node.error(e+ "\n"+msg.payload); }
                }
                else if (typeof msg.payload === "object") {
                    if (!Buffer.isBuffer(msg.payload) ) {
                        if (!util.isArray(msg.payload)) {
                            msg.payload = JSON.stringify(msg.payload);
                            node.send(msg);
                        }
                    }
                }
                else { node.warn("dropped: "+msg.payload); }
            }
        });
    }
    RED.nodes.registerType("json",JSONNode);
}
