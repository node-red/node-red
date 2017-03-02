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

    var jsonata = require('jsonata');

    var operators = {
        'eq': function(a, b) { return a == b; },
        'neq': function(a, b) { return a != b; },
        'lt': function(a, b) { return a < b; },
        'lte': function(a, b) { return a <= b; },
        'gt': function(a, b) { return a > b; },
        'gte': function(a, b) { return a >= b; },
        'btwn': function(a, b, c) { return a >= b && a <= c; },
        'cont': function(a, b) { return (a + "").indexOf(b) != -1; },
        'regex': function(a, b, c, d) { return (a + "").match(new RegExp(b,d?'i':'')); },
        'true': function(a) { return a === true; },
        'false': function(a) { return a === false; },
        'null': function(a) { return (typeof a == "undefined" || a === null); },
        'nnull': function(a) { return (typeof a != "undefined" && a !== null); },
        'else': function(a) { return a === true; }
    };

    function SwitchNode(n) {
        RED.nodes.createNode(this, n);
        this.rules = n.rules || [];
        this.property = n.property;
        this.propertyType = n.propertyType || "msg";

        if (this.propertyType === 'jsonata') {
            try {
                this.property = jsonata(this.property);
            } catch(err) {
                this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                return;
            }
        }

        this.checkall = n.checkall || "true";
        this.previousValue = null;
        var node = this;
        var valid = true;
        for (var i=0; i<this.rules.length; i+=1) {
            var rule = this.rules[i];
            if (!rule.vt) {
                if (!isNaN(Number(rule.v))) {
                    rule.vt = 'num';
                } else {
                    rule.vt = 'str';
                }
            }
            if (rule.vt === 'num') {
                if (!isNaN(Number(rule.v))) {
                    rule.v = Number(rule.v);
                }
            } else if (rule.vt === "jsonata") {
                try {
                    rule.v = jsonata(rule.v);
                } catch(err) {
                    this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                    valid = false;
                }
            }
            if (typeof rule.v2 !== 'undefined') {
                if (!rule.v2t) {
                    if (!isNaN(Number(rule.v2))) {
                        rule.v2t = 'num';
                    } else {
                        rule.v2t = 'str';
                    }
                }
                if (rule.v2t === 'num') {
                    rule.v2 = Number(rule.v2);
                } else if (rule.v2t === 'jsonata') {
                    try {
                        rule.v2 = jsonata(rule.v2);
                    } catch(err) {
                        this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                        valid = false;
                    }
                }
            }
        }

        if (!valid) {
            return;
        }

        this.on('input', function (msg) {
            var onward = [];
            try {
                var prop;
                if (node.propertyType === 'jsonata') {
                    prop = node.property.evaluate({msg:msg});
                } else {
                    prop = RED.util.evaluateNodeProperty(node.property,node.propertyType,node,msg);
                }
                var elseflag = true;
                for (var i=0; i<node.rules.length; i+=1) {
                    var rule = node.rules[i];
                    var test = prop;
                    var v1,v2;
                    if (rule.vt === 'prev') {
                        v1 = node.previousValue;
                    } else if (rule.vt === 'jsonata') {
                        try {
                            v1 = rule.v.evaluate({msg:msg});
                        } catch(err) {
                            node.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                            return;
                        }
                    } else {
                        try {
                            v1 = RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg);
                        } catch(err) {
                            v1 = undefined;
                        }
                    }
                    v2 = rule.v2;
                    if (rule.v2t === 'prev') {
                        v2 = node.previousValue;
                    } else if (rule.v2t === 'jsonata') {
                        try {
                            v2 = rule.v2.evaluate({msg:msg});
                        } catch(err) {
                            node.error(RED._("switch.errors.invalid-expr",{error:err.message}));
                            return;
                        }
                    } else if (typeof v2 !== 'undefined') {
                        try {
                            v2 = RED.util.evaluateNodeProperty(rule.v2,rule.v2t,node,msg);
                        } catch(err) {
                            v2 = undefined;
                        }
                    }
                    if (rule.t == "else") { test = elseflag; elseflag = true; }
                    if (operators[rule.t](test,v1,v2,rule.case)) {
                        onward.push(msg);
                        elseflag = false;
                        if (node.checkall == "false") { break; }
                    } else {
                        onward.push(null);
                    }
                }
                node.previousValue = prop;
                this.send(onward);
            } catch(err) {
                node.warn(err);
            }
        });
    }
    RED.nodes.registerType("switch", SwitchNode);
}
