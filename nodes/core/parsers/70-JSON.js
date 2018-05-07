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

    function JSONNode(n) {
        RED.nodes.createNode(this,n);
        this.indent = n.pretty ? 4 : 0;
        this.action = n.action||"";
        this.property = n.property||"payload";
        var node = this;
        this.on("input", function(msg) {
            var value = RED.util.getMessageProperty(msg,node.property);
            if (value !== undefined) {
                if (typeof value === "string") {
                    if (node.action === "" || node.action === "obj") {
                        try {
                            RED.util.setMessageProperty(msg,node.property,JSON.parse(value));
                            node.send(msg);
                        }
                        catch(e) { node.error(e.message,msg); }
                    } else {
                        node.send(msg);
                    }
                }
                else if (typeof value === "object") {
                    if (node.action === "" || node.action === "str") {
                        if (!Buffer.isBuffer(value)) {
                            try {
                                RED.util.setMessageProperty(msg,node.property,JSON.stringify(value,null,node.indent));
                                node.send(msg);
                            }
                            catch(e) { node.error(RED._("json.errors.dropped-error")); }
                        }
                        else { node.warn(RED._("json.errors.dropped-object")); }
                    } else {
                        node.send(msg);
                    }
                }
                else { node.warn(RED._("json.errors.dropped")); }
            }
            else { node.send(msg); } // If no property - just pass it on.
        });
    }
    RED.nodes.registerType("json",JSONNode);
}
