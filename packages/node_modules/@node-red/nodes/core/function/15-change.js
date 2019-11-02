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

    function ChangeNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;

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
            } else if (rule.tot === 'json' || rule.tot === 'bin') {
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
                    rule.to = RED.util.prepareJSONataExpression(rule.to,this);
                } catch(e) {
                    valid = false;
                    this.error(RED._("change.errors.invalid-expr",{error:e.message}));
                }
            } else if (rule.tot === 'env') {
                rule.to = RED.util.evaluateNodeProperty(rule.to,'env',node);
            }
        }

        function getToValue(msg,rule,done) {
            var value = rule.to;
            if (rule.tot === 'json') {
                value = JSON.parse(rule.to);
            } else if (rule.tot === 'bin') {
                value = Buffer.from(JSON.parse(rule.to))
            }
            if (rule.tot === "msg") {
                value = RED.util.getMessageProperty(msg,rule.to);
            } else if ((rule.tot === 'flow') || (rule.tot === 'global')) {
                RED.util.evaluateNodeProperty(rule.to, rule.tot, node, msg, (err,value) => {
                    if (err) {
                        done(undefined,undefined);
                    } else {
                        done(undefined,value);
                    }
                });
                return
            } else if (rule.tot === 'date') {
                value = Date.now();
            } else if (rule.tot === 'jsonata') {
                RED.util.evaluateJSONataExpression(rule.to,msg, (err, value) => {
                    if (err) {
                        done(RED._("change.errors.invalid-expr",{error:err.message}))
                    } else {
                        done(undefined, value);
                    }
                });
                return;
            }
            done(undefined,value);
        }

        function getFromValueType(fromValue, done) {
            var fromType;
            var fromRE;
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
                    done(new Error(RED._("change.errors.invalid-from",{error:e.message})));
                }
            } else {
                done(new Error(RED._("change.errors.invalid-from",{error:"unsupported type: "+(typeof fromValue)})));
            }
            done(undefined,{
                fromType,
                fromValue,
                fromRE
            });
        }
        function getFromValue(msg,rule, done) {
            var fromValue;
            var fromType;
            var fromRE;
            if (rule.t === 'change') {
                if (rule.fromt === 'msg' || rule.fromt === 'flow' || rule.fromt === 'global') {
                    if (rule.fromt === "msg") {
                        return getFromValueType(RED.util.getMessageProperty(msg,rule.from),done);
                    } else if (rule.fromt === 'flow' || rule.fromt === 'global') {
                        var contextKey = RED.util.parseContextStore(rule.from);
                        node.context()[rule.fromt].get(contextKey.key, contextKey.store, (err,fromValue) => {
                            if (err) {
                                done(err)
                            } else {
                                getFromValueType(fromValue,done);
                            }
                        });
                        return;
                    }
                } else {
                    fromType = rule.fromt;
                    fromValue = rule.from;
                    fromRE = rule.fromRE;
                }
            }
            done(undefined, {
                fromType,
                fromValue,
                fromRE
            });
        }
        function applyRule(msg,rule,done) {
            var property = rule.p;
            var current;
            var fromValue;
            var fromType;
            var fromRE;

            try {
                getToValue(msg,rule,(err,value) => {
                    if (err) {
                        node.error(err, msg);
                        return done(undefined,null);
                    } else {
                        getFromValue(msg,rule,(err,fromParts) => {
                            if (err) {
                                node.error(err, msg);
                                return done(undefined,null);
                            } else {
                                fromValue = fromParts.fromValue;
                                fromType = fromParts.fromType;
                                fromRE = fromParts.fromRE;
                                if (rule.pt === 'msg') {
                                    try {
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
                                    } catch(err) {}
                                    return done(undefined,msg);
                                } else if (rule.pt === 'flow' || rule.pt === 'global') {
                                    var contextKey = RED.util.parseContextStore(property);
                                    var target = node.context()[rule.pt];
                                    var callback = err => {
                                        if (err) {
                                            node.error(err, msg);
                                            return done(undefined,null);
                                        } else {
                                            done(undefined,msg);
                                        }
                                    }
                                    if (rule.t === 'delete') {
                                        target.set(contextKey.key,undefined,contextKey.store,callback);
                                    } else if (rule.t === 'set') {
                                        target.set(contextKey.key,value,contextKey.store,callback);
                                    } else if (rule.t === 'change') {
                                        target.get(contextKey.key,contextKey.store,(err,current) => {
                                            if (err) {
                                                node.error(err, msg);
                                                return done(undefined,null);
                                            }
                                            if (typeof current === 'string') {
                                                if ((fromType === 'num' || fromType === 'bool' || fromType === 'str') && current === fromValue) {
                                                    // str representation of exact from number/boolean
                                                    // only replace if they match exactly
                                                    target.set(contextKey.key,value,contextKey.store,callback);
                                                } else {
                                                    current = current.replace(fromRE,value);
                                                    target.set(contextKey.key,current,contextKey.store,callback);
                                                }
                                            } else if ((typeof current === 'number' || current instanceof Number) && fromType === 'num') {
                                                if (current == Number(fromValue)) {
                                                    target.set(contextKey.key,value,contextKey.store,callback);
                                                }
                                            } else if (typeof current === 'boolean' && fromType === 'bool') {
                                                if (current.toString() === fromValue) {
                                                    target.set(contextKey.key,value,contextKey.store,callback);
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        })
                    }
                });
            } catch(err) {
                // This is an okay error
                done(undefined,msg);
            }
        }
        function completeApplyingRules(msg,currentRule,done) {
            if (!msg) {
                return done();
            } else if (currentRule === node.rules.length - 1) {
                return done(undefined, msg);
            } else {
                applyRules(msg, currentRule+1,done);
            }
        }
        function applyRules(msg, currentRule, done) {
            if (currentRule >= node.rules.length) {
                return done(undefined,msg);
            }
            var r = node.rules[currentRule];
            if (r.t === "move") {
                if ((r.tot !== r.pt) || (r.p.indexOf(r.to) !== -1)) {
                    applyRule(msg,{t:"set", p:r.to, pt:r.tot, to:r.p, tot:r.pt},(err,msg) => {
                        applyRule(msg,{t:"delete", p:r.p, pt:r.pt}, (err,msg) => {
                            completeApplyingRules(msg,currentRule,done);
                        })
                    });
                } else { // 2 step move if we are moving from a child
                    applyRule(msg,{t:"set", p:"_temp_move", pt:r.tot, to:r.p, tot:r.pt},(err,msg)=> {
                        applyRule(msg,{t:"delete", p:r.p, pt:r.pt},(err,msg)=> {
                            applyRule(msg,{t:"set", p:r.to, pt:r.tot, to:"_temp_move", tot:r.pt},(err,msg)=> {
                                applyRule(msg,{t:"delete", p:"_temp_move", pt:r.pt},(err,msg)=> {
                                    completeApplyingRules(msg,currentRule,done);
                                });
                            });
                        });
                    });
                }
            } else {
                applyRule(msg,r,(err,msg)=> { completeApplyingRules(msg,currentRule,done); });
            }
        }

        if (valid) {
            this.on('input', function(msg, send, done) {
                applyRules(msg, 0, (err,msg) => {
                    if (err) {
                        done(err);
                    } else if (msg) {
                        send(msg);
                        done();
                    }
                })
            });
        }
    }
    RED.nodes.registerType("change", ChangeNode);
};
