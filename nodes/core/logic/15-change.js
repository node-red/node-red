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
            // Migrate to type-aware rules
            if (!rule.pt) {
                rule.pt = "msg";
            }
            if (rule.t === "change" && rule.re) {
                rule.fromt = 're';
                delete rule.re;
            }
            if (rule.t === "set" && !rule.tot) {
                if (rule.to.indexOf("msg.") === 0 && !rule.tot) {
                    rule.to = rule.to.substring(4);
                    rule.tot = "msg";
                }
            }
            if (!rule.tot) {
                rule.tot = "str";
            }
            if (!rule.fromt) {
                rule.fromt = "str";
            }
            if (rule.t === "change") {
                if (rule.fromt !== 're') {
                    rule.from = rule.from.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                }
                try {
                    rule.from = new RegExp(rule.from, "g");
                } catch (e) {
                    valid = false;
                    this.error(RED._("change.errors.invalid-from",{error:e.message}));
                }
            }
            if (rule.tot === 'num') {
                rule.to = Number(rule.to);
            } else if (rule.tot === 'json') {
                try {
                    rule.to = JSON.parse(rule.to);
                } catch(e2) {
                    valid = false;
                    this.error(RED._("change.errors.invalid-json"));
                }
            } else if (rule.tot === 'bool') {
                rule.to = /^true$/i.test(rule.to);
            }
        }

        function applyRule(msg,rule) {
            try {
                var property = rule.p;
                var value = rule.to;
                if (rule.tot === "msg") {
                    value = RED.util.getMessageProperty(msg,rule.to);
                } else if (rule.tot === 'flow') {
                    value = node.context().flow.get(rule.to);
                } else if (rule.tot === 'global') {
                    value = node.context().global.get(rule.to);
                }
                if (rule.pt === 'msg') {
                    if (rule.t === 'delete') {
                        RED.util.setMessageProperty(msg,property,undefined);
                    } else if (rule.t === 'set') {
                        RED.util.setMessageProperty(msg,property,value);
                    } else if (rule.t === 'change') {
                        var current = RED.util.getMessageProperty(msg,property);
                        if (typeof current === 'string') {
                            current = current.replace(rule.from,value);
                            RED.util.setMessageProperty(msg,property,current);
                        }
                    }
                } else {
                    var target;
                    if (rule.pt === 'flow') {
                        target = node.context().flow;
                    } else if (rule.pt === 'global') {
                        target = node.context().global;
                    }
                    if (target) {
                        if (rule.t === 'delete') {
                            target.set(property,undefined);
                        } else if (rule.t === 'set') {
                            target.set(property,value);
                        } else if (rule.t === 'change') {
                            var current = target.get(msg,property);
                            if (typeof current === 'string') {
                                current = current.replace(rule.from,value);
                                target.set(property,current);
                            }
                        }
                    }

                }
            } catch(err) {console.log(err.stack)}
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
