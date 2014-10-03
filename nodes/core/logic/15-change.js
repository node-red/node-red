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
    function ChangeNode(n) {
        RED.nodes.createNode(this, n);
        this.action = n.action;
        this.property = n.property || "";
        this.from = n.from || "";
        this.to = n.to || "";
        this.reg = (n.reg === null || n.reg);
        var node = this;
        if (node.reg === false) {
            this.from = this.from.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }

        this.on('input', function (msg) {
            var propertyParts;
            var depth = 0;

            if (node.action === "change") {
                try {
                    node.re = new RegExp(this.from, "g");
                } catch (e) {
                    node.error(e.message);
                }
            }

            propertyParts = node.property.split(".");
            try {
                propertyParts.reduce(function (obj, i) {
                    if (++depth === propertyParts.length) {
                        if (node.action === "change") {
                            if (typeof obj[i] === "string") {
                                obj[i] = obj[i].replace(node.re, node.to);
                            }
                        } else if (node.action === "replace") {
                            obj[i] = node.to;
                        } else if (node.action === "delete") {
                            delete(obj[i]);
                        }
                    } else {
                        if (!obj[i]) {
                            obj[i] = {};
                        }
                        return obj[i];
                    }
                }, msg);
            } catch (err) {}
            node.send(msg);
        });
    }
    RED.nodes.registerType("change", ChangeNode);
};
