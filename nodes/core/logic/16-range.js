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
    function RangeNode(n) {
        RED.nodes.createNode(this, n);
        this.action = n.action;
        this.round = n.round || false;
        this.minin = Number(n.minin);
        this.maxin = Number(n.maxin);
        this.minout = Number(n.minout);
        this.maxout = Number(n.maxout);
        var node = this;

        this.on('input', function (msg) {
            if (msg.hasOwnProperty("payload")) {
                var n = Number(msg.payload);
                if (!isNaN(n)) {
                    if (node.action == "clamp") {
                        if (n < node.minin) { n = node.minin; }
                        if (n > node.maxin) { n = node.maxin; }
                    }
                    if (node.action == "roll") {
                        if (n >= node.maxin) { n = (n - node.minin) % (node.maxin - node.minin) + node.minin; }
                        if (n <  node.minin) { n = (n - node.minin) % (node.maxin - node.minin) + node.maxin; }
                    }
                    msg.payload = ((n - node.minin) / (node.maxin - node.minin) * (node.maxout - node.minout)) + node.minout;
                    if (node.round) { msg.payload = Math.round(msg.payload); }
                    node.send(msg);
                }
                else { node.log("Not a number: "+msg.payload); }
            }
            else { node.send(msg); } // If no payload - just pass it on.
        });
    }
    RED.nodes.registerType("range", RangeNode);
}
