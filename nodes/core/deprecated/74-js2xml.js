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
    var js2xmlparser = require("js2xmlparser");

    function Js2XmlNode(n) {
        RED.nodes.createNode(this,n);
        this.warn("This node has been deprecated and will be deleted in a future release. Please update your flow to use the 'xml' node.");
        this.root = n.root;
        var node = this;

        this.on("input", function(msg) {
            try {
                var root = node.root || typeof msg.payload;
                if (typeof msg.payload !== "object") { msg.payload = '"'+msg.payload+'"'; }
                console.log(root, typeof msg.payload,msg.payload);
                msg.payload = js2xmlparser(root, msg.payload);
                node.send(msg);
            }
            catch(e) { console.log(e); }
        });
    }
    RED.nodes.registerType("json2xml",Js2XmlNode);
}
