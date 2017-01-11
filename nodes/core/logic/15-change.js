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
    var jsonata = require("jsonata");

    function ChangeNode(n) {
        RED.nodes.createNode(this, n);

        this.rules = n.rules;
        var rule;
        if (!this.rules) {
            rule = {
                t:(n.action=="replace"?"set":n.action),
                p:n.property||""
            }

            if ((rule.t === "set")||(rule.t === "move")) {
                rule.to = n.to||"";
            } else if (rule.t === "change") {
                rule.from = n.from||"";
                rule.to = n.to||"";
                rule.re = (n.reg===null||n.reg);
            }
            this.rules = [rule];
        }

        var valid = true;
        for (var i=0;i<this.rules.length;i++) {
            rule = this.rules[i];
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
            if (rule.t === "change" && rule.fromt !== 'msg' && rule.fromt !== 'flow' && rule.fromt !== 'global') {
                rule.fromRE = rule.from;
                if (rule.fromt !== 're') {
                    rule.fromRE = rule.fromRE.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                }
                try {
                    rule.fromRE = new RegExp(rule.fromRE, "g");
                } catch (e) {
                    valid = false;
                    this.error(RED._("change.errors.invalid-from",{error:e.message}));
                }
            }
            if (rule.tot === 'num') {
                rule.to = Number(rule.to);
            } else if (rule.tot === 'json') {
                try {
                    // check this is parsable JSON
                    JSON.parse(rule.to);
                } catch(e2) {
                    valid = false;
                    this.error(RED._("change.errors.invalid-json"));
                }
            } else if (rule.tot === 'bool') {
                rule.to = /^true$/i.test(rule.to);
            } else if (rule.tot === 'jsonata') {
                try {
                    rule.to = jsonata(rule.to);
                } catch(e) {
                    valid = false;
                    this.error(RED._("change.errors.invalid-from",{error:e.message}));
                }
            }
        }

        function applyRule(msg,rule) {
            try {
                var property = rule.p;
                var value = rule.to;
                if (rule.tot === 'json') {
                    value = JSON.parse(rule.to);
                }
                var current;
                var fromValue;
                var fromType;
                var fromRE;
                if (rule.tot === "msg") {
                    value = RED.util.getMessageProperty(msg,rule.to);
                } else if (rule.tot === 'flow') {
                    value = node.context().flow.get(rule.to);
                } else if (rule.tot === 'global') {
                    value = node.context().global.get(rule.to);
                } else if (rule.tot === 'date') {
                    value = Date.now();
                } else if (rule.tot === 'jsonata') {
                    value = rule.to.evaluate({msg:msg});
                }
                if (rule.t === 'change') {
                    if (rule.fromt === 'msg' || rule.fromt === 'flow' || rule.fromt === 'global') {
                        if (rule.fromt === "msg") {
                            fromValue = RED.util.getMessageProperty(msg,rule.from);
                        } else if (rule.tot === 'flow') {
                            fromValue = node.context().flow.get(rule.from);
                        } else if (rule.tot === 'global') {
                            fromValue = node.context().global.get(rule.from);
                        }
                        if (typeof fromValue === 'number' || fromValue instanceof Number) {
                            fromType = 'num';
                        } else if (typeof fromValue === 'boolean') {
                            fromType = 'bool'
                        } else if (fromValue instanceof RegExp) {
                            fromType = 're';
                            fromRE = fromValue;
                        } else if (typeof fromValue === 'string') {
                            fromType = 'str';
                            fromRE = fromValue.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                            try {
                                fromRE = new RegExp(fromRE, "g");
                            } catch (e) {
                                valid = false;
                                node.error(RED._("change.errors.invalid-from",{error:e.message}));
                                return;
                            }
                        } else {
                            node.error(RED._("change.errors.invalid-from",{error:"unsupported type: "+(typeof fromValue)}));
                            return
                        }
                    } else {
                        fromType = rule.fromt;
                        fromValue = rule.from;
                        fromRE = rule.fromRE;
                    }
                }
                if (rule.pt === 'msg') {
                    if (rule.t === 'delete') {
                        RED.util.setMessageProperty(msg,property,undefined);
                    } else if (rule.t === 'set') {
                        RED.util.setMessageProperty(msg,property,value);
                    } else if (rule.t === 'change') {
                        current = RED.util.getMessageProperty(msg,property);
                        if (typeof current === 'string') {
                            if ((fromType === 'num' || fromType === 'bool' || fromType === 'str') && current === fromValue) {
                                // str representation of exact from number/boolean
                                // only replace if they match exactly
                                RED.util.setMessageProperty(msg,property,value);
                            } else {
                                current = current.replace(fromRE,value);
                                RED.util.setMessageProperty(msg,property,current);
                            }
                        } else if ((typeof current === 'number' || current instanceof Number) && fromType === 'num') {
                            if (current == Number(fromValue)) {
                                RED.util.setMessageProperty(msg,property,value);
                            }
                        } else if (typeof current === 'boolean' && fromType === 'bool') {
                            if (current.toString() === fromValue) {
                                RED.util.setMessageProperty(msg,property,value);
                            }
                        }
                    }
                }
                else {
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
                            current = target.get(msg,property);
                            if (typeof current === 'string') {
                                if ((fromType === 'num' || fromType === 'bool' || fromType === 'str') && current === fromValue) {
                                    // str representation of exact from number/boolean
                                    // only replace if they match exactly
                                    target.set(property,value);
                                } else {
                                    current = current.replace(fromRE,value);
                                    target.set(property,current);
                                }
                            } else if ((typeof current === 'number' || current instanceof Number) && fromType === 'num') {
                                if (current == Number(fromValue)) {
                                    target.set(property,value);
                                }
                            } else if (typeof current === 'boolean' && fromType === 'bool') {
                                if (current.toString() === fromValue) {
                                    target.set(property,value);
                                }
                            }
                        }
                    }
                }
            } catch(err) {/*console.log(err.stack)*/}
            return msg;
        }
        if (valid) {
            var node = this;
            this.on('input', function(msg) {
                for (var i=0; i<this.rules.length; i++) {
                    if (this.rules[i].t === "move") {
                        var r = this.rules[i];
                        if ((r.tot !== r.pt) || (r.p.indexOf(r.to) !== -1)) {
                            msg = applyRule(msg,{t:"set", p:r.to, pt:r.tot, to:r.p, tot:r.pt});
                            applyRule(msg,{t:"delete", p:r.p, pt:r.pt});
                        }
                        else { // 2 step move if we are moving from a child
                            msg = applyRule(msg,{t:"set", p:"_temp_move", pt:r.tot, to:r.p, tot:r.pt});
                            applyRule(msg,{t:"delete", p:r.p, pt:r.pt});
                            msg = applyRule(msg,{t:"set", p:r.to, pt:r.tot, to:"_temp_move", tot:r.pt});
                            applyRule(msg,{t:"delete", p:"_temp_move", pt:r.pt});
                        }
                    } else {
                        msg = applyRule(msg,this.rules[i]);
                    }
                    if (msg === null) {
                        return;
                    }
                }
                node.send(msg);
            });
        }
    }
    RED.nodes.registerType("change", ChangeNode);
};
