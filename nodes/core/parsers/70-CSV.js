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
    function CSVNode(n) {
        RED.nodes.createNode(this,n);
        this.template = n.temp.split(",");
        this.sep = n.sep || ',';
        this.sep = this.sep.replace("\\n","\n").replace("\\r","\r").replace("\\t","\t");
        this.quo = '"';
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                if (typeof msg.payload == "object") { // convert to csv
                    try {
                        var o = "";
                        for (var i in node.template) {
                            if (msg.payload.hasOwnProperty(node.template[i])) {
                                if (msg.payload[node.template[i]].indexOf(node.sep) != -1) {
                                    o += node.quo + msg.payload[node.template[i]] + node.quo + node.sep;
                                }
                                else if (msg.payload[node.template[i]].indexOf(node.quo) != -1) {
                                    msg.payload[node.template[i]] = msg.payload[node.template[i]].replace(/"/g, '""');
                                    o += node.quo + msg.payload[node.template[i]] + node.quo + node.sep;
                                }
                                else { o += msg.payload[node.template[i]] + node.sep; }
                            }
                        }
                        msg.payload = o.slice(0,-1);
                        node.send(msg);
                    }
                    catch(e) { node.log(e); }
                }
                else if (typeof msg.payload == "string") { // convert to object
                    try {
                        var f = true;
                        var j = 0;
                        var k = [""];
                        var o = {};
                        for (var i = 0; i < msg.payload.length; i++) {
                            if (msg.payload[i] === node.quo) {
                                f = !f;
                                if (msg.payload[i-1] === node.quo) { k[j] += '\"'; }
                            }
                            else if ((msg.payload[i] === node.sep) && f) {
                                if ( node.template[j] && (node.template[j] != "") ) { o[node.template[j]] = k[j]; }
                                j += 1;
                                k[j] = "";
                            }
                            else {
                                k[j] += msg.payload[i];
                            }
                        }
                        if ( node.template[j] && (node.template[j] != "") ) { o[node.template[j]] = k[j]; }
                        msg.payload = o;
                        node.send(msg);
                    }
                    catch(e) { node.log(e); }
                }
                else { node.log("This node only handles csv strings or js objects."); }
            }
        });
    }
    RED.nodes.registerType("csv",CSVNode);
}
