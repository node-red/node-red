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
    var mustache = require("mustache");
    var yaml = require("js-yaml");

    function extractTokens(tokens,set) {
        set = set || new Set();
        tokens.forEach(function(token) {
            if (token[0] !== 'text') {
                set.add(token[1]);
                if (token.length > 4) {
                    extractTokens(token[4],set);
                }
            }
        });
        return set;
    }

    function parseContext(key) {
        var match = /^(flow|global)(\[(\w+)\])?\.(.+)/.exec(key);
        if (match) {
            var parts = {};
            parts.type = match[1];
            parts.store = (match[3] === '') ? "default" : match[3];
            parts.field = match[4];
            return parts;
        }
        return undefined;
    }

    function parseEnv(key) {
        var match = /^env\.(.+)/.exec(key);
        if (match) {
            return match[1];
        }
        return undefined;
    }

    /**
     * Custom Mustache Context capable to collect message property and node
     * flow and global context
     */

    function NodeContext(msg, nodeContext, parent, escapeStrings, cachedContextTokens) {
        this.msgContext = new mustache.Context(msg,parent);
        this.nodeContext = nodeContext;
        this.escapeStrings = escapeStrings;
        this.cachedContextTokens = cachedContextTokens;
    }

    NodeContext.prototype = new mustache.Context();

    NodeContext.prototype.lookup = function (name) {
        // try message first:
        try {
            var value = this.msgContext.lookup(name);
            if (value !== undefined) {
                if (this.escapeStrings && typeof value === "string") {
                    value = value.replace(/\\/g, "\\\\");
                    value = value.replace(/\n/g, "\\n");
                    value = value.replace(/\t/g, "\\t");
                    value = value.replace(/\r/g, "\\r");
                    value = value.replace(/\f/g, "\\f");
                    value = value.replace(/[\b]/g, "\\b");
                }
                return value;
            }

            // try env
            if (parseEnv(name)) {
                return this.cachedContextTokens[name];
            }

            // try flow/global context:
            var context = parseContext(name);
            if (context) {
                var type = context.type;
                var store = context.store;
                var field = context.field;
                var target = this.nodeContext[type];
                if (target) {
                    return this.cachedContextTokens[name];
                }
            }
            return '';
        }
        catch(err) {
            throw err;
        }
    }

    NodeContext.prototype.push = function push (view) {
        return new NodeContext(view, this.nodeContext, this.msgContext, undefined, this.cachedContextTokens);
    };

    function TemplateNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.field = n.field || "payload";
        this.template = n.template;
        this.syntax = n.syntax || "mustache";
        this.fieldType = n.fieldType || "msg";
        this.outputFormat = n.output || "str";

        var node = this;

        function output(msg,value,send,done) {
            /* istanbul ignore else  */
            if (node.outputFormat === "json") {
                value = JSON.parse(value);
            }
            /* istanbul ignore else  */
            if (node.outputFormat === "yaml") {
                value = yaml.load(value);
            }

            if (node.fieldType === 'msg') {
                RED.util.setMessageProperty(msg, node.field, value);
                send(msg);
                done();
            } else if ((node.fieldType === 'flow') ||
                       (node.fieldType === 'global')) {
                var context = RED.util.parseContextStore(node.field);
                var target = node.context()[node.fieldType];
                target.set(context.key, value, context.store, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        send(msg);
                        done();
                    }
                });
            }
        }

        node.on("input", function(msg, send, done) {

            try {
                /***
                * Allow template contents to be defined externally
                * through inbound msg.template IFF node.template empty
                */
                var template = node.template;
                if (msg.hasOwnProperty("template")) {
                    if (template == "" || template === null) {
                        template = msg.template;
                    }
                }

                if (node.syntax === "mustache") {
                    var is_json = (node.outputFormat === "json");
                    var promises = [];
                    var tokens = extractTokens(mustache.parse(template));
                    var resolvedTokens = {};
                    tokens.forEach(function(name) {
                        var env_name = parseEnv(name);
                        if (env_name) {
                            var promise = new Promise((resolve, reject) => {
                                var val = RED.util.evaluateNodeProperty(env_name, 'env', node)
                                resolvedTokens[name] = val;
                                resolve();
                            });
                            promises.push(promise);
                            return;
                        }

                        var context = parseContext(name);
                        if (context) {
                            var type = context.type;
                            var store = context.store;
                            var field = context.field;
                            var target = node.context()[type];
                            if (target) {
                                var promise = new Promise((resolve, reject) => {
                                    target.get(field, store, (err, val) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolvedTokens[name] = val;
                                            resolve();
                                        }
                                    });
                                });
                                promises.push(promise);
                                return;
                            }
                        }
                    });

                    Promise.all(promises).then(function() {
                        var value = mustache.render(template, new NodeContext(msg, node.context(), null, is_json, resolvedTokens));
                        output(msg, value, send, done);
                    }).catch(function (err) {
                        done(err.message);
                    });
                } else {
                    output(msg, template, send, done);
                }
            }
            catch(err) {
                done(err.message);
            }
        });
    }

    RED.nodes.registerType("template",TemplateNode);
    RED.library.register("templates");
}
