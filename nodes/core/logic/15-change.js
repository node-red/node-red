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
        if (this.reg === false) {
            this.from = this.from.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }
        var valid = true;
        if (this.action === "change") {
            try {
                this.re = new RegExp(this.from, "g");
            } catch (e) {
                valid = false;
                this.error("Invalid 'from' property: "+e.message);
            }
        }
        if (valid) {
            var node = this;
            this.on('input', function(msg) {
                var propertyParts;
                var depth = 0;
    
                propertyParts = node.property.split(".");
                try {
                    propertyParts.reduce(function(obj, i) {
                        var to = node.to;
                        // Set msg from property to another msg property
                        if (node.action === "replace" && node.to.indexOf("msg.") === 0) {
                            var parts = to.substring(4);
                            var msgPropParts = parts.split(".");
                            try {
                                msgPropParts.reduce(function(ob, j) {
                                    to = (typeof ob[j] !== "undefined" ? ob[j] : undefined);
                                    return to;
                                }, msg);
                            } catch (err) {}
                        }
    
                        if (++depth === propertyParts.length) {
                            if (node.action === "change") {
                                if (typeof obj[i] === "string") {
                                    obj[i] = obj[i].replace(node.re, node.to);
                                }
                            } else if (node.action === "replace") {
                                if (typeof to === "undefined") {
                                    delete(obj[i]);
                                } else {
                                    obj[i] = to;
                                }
                            } else if (node.action === "delete") {
                                delete(obj[i]);
                            }
                        } else {
                            // to property doesn't exist, don't create empty object
                            if (typeof to === "undefined") {
                                return;
                            // setting a non-existent multilevel object, create empty parent
                            } else if (!obj[i]) {
                                obj[i] = {};
                            }
                            return obj[i];
                        }
                    }, msg);
                } catch (err) {}
                node.send(msg);
            });
        }
    }
    RED.nodes.registerType("change", ChangeNode);
};
