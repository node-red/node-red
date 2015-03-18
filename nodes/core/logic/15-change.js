/**
 * Copyright 2013, 2015 IBM Corp.
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
        
        this.rules = n.rules;
        
        if (!this.rules) {
            var rule = {
                t:(n.action=="replace"?"set":n.action),
                p:n.property||""
            }
            
            if (rule.t === "set") {
                rule.to = n.to||"";
            } else if (rule.t === "change") {
                rule.from = n.from||"";
                rule.to = n.to||"";
                rule.re = (n.reg===null||n.reg);
            }
            this.rules = [rule];
        }
        
        this.actions = [];

        var valid = true;
        
        for (var i=0;i<this.rules.length;i++) {
            var rule = this.rules[i];
            if (rule.t === "change") {
                if (rule.re === false) {
                    rule.from = rule.from.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                }
                try {
                    rule.from = new RegExp(rule.from, "g");
                } catch (e) {
                    valid = false;
                    this.error("Invalid 'from' property: "+e.message);
                }
            }
        }
        
        function applyRule(msg,rule) {
            var propertyParts;
            var depth = 0;

            propertyParts = rule.p.split(".");
            try {
                propertyParts.reduce(function(obj, i) {
                    var to = rule.to;
                    // Set msg from property to another msg property
                    if (rule.t === "set" && rule.to.indexOf("msg.") === 0) {
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
                        if (rule.t === "change") {
                            if (typeof obj[i] === "string") {
                                obj[i] = obj[i].replace(rule.from, rule.to);
                            }
                        } else if (rule.t === "set") {
                            if (typeof to === "undefined") {
                                delete(obj[i]);
                            } else {
                                obj[i] = to;
                            }
                        } else if (rule.t === "delete") {
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
            return msg;
        }
        
        if (valid) {
            var node = this;
            this.on('input', function(msg) {
                for (var i=0;i<this.rules.length;i++) {
                    msg = applyRule(msg,this.rules[i]);
                }
                node.send(msg);
            });
        }
    }
    RED.nodes.registerType("change", ChangeNode);
};
