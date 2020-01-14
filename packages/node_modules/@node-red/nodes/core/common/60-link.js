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

    function LinkInNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var event = "node:"+n.id;
        var handler = function(msg) {
            msg._event = n.event;
            node.receive(msg);
        }
        RED.events.on(event,handler);
        this.on("input", function(msg) {
            this.send(msg);
        });
        this.on("close",function() {
            RED.events.removeListener(event,handler);
        });
    }

    RED.nodes.registerType("link in",LinkInNode);

    function LinkOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var event = "node:"+n.id;
        this.on("input", function(msg) {
            msg._event = event;
            RED.events.emit(event,msg)
            this.send(msg);
        });
    }
    RED.nodes.registerType("link out",LinkOutNode);
}
