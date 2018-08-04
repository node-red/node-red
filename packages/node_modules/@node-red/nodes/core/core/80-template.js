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

    /**
     * Custom Mustache Context capable to collect message property and node
     * flow and global context
     */

    function NodeContext(msg, nodeContext, parent, escapeStrings, promises, results) {
        this.msgContext = new mustache.Context(msg,parent);
        this.nodeContext = nodeContext;
        this.escapeStrings = escapeStrings;
        this.promises = promises;
        this.results = results;
    }

    NodeContext.prototype = new mustache.Context();

    NodeContext.prototype.lookup = function (name) {
        var results = this.results;
        if (results) {
            var val = results.shift();
            return val;
        }
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
                this.promises.push(Promise.resolve(value));
                return value;
            }

            // try flow/global context:
            var context = parseContext(name);
            if (context) {
                var type = context.type;
                var store = context.store;
                var field = context.field;
                var target = this.nodeContext[type];
                if (target) {
                    var promise = new Promise((resolve, reject) => {
                        var callback = (err, val) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(val);
                            }
                        };
                        target.get(field, store, callback);
                    });
                    this.promises.push(promise);
                    return '';
                }
                else {
                    this.promises.push(Promise.resolve(''));
                    return '';
                }
            }
            else {
                this.promises.push(Promise.resolve(''));
                return '';
            }
        }
        catch(err) {
            throw err;
        }
    }

    NodeContext.prototype.push = function push (view) {
        return new NodeContext(view, this.nodeContext, this.msgContext, undefined, this.promises, this.results);
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
        node.on("input", function(msg) {
            function output(value) {
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
                    node.send(msg);
                } else if ((node.fieldType === 'flow') ||
                           (node.fieldType === 'global')) {
                    var context = RED.util.parseContextStore(node.field);
                    var target = node.context()[node.fieldType];
                    target.set(context.key, value, context.store, function (err) {
                        if (err) {
                            node.error(err, msg);
                        } else {
                            node.send(msg);
                        }
                    });
                }
            }
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
                    mustache.render(template, new NodeContext(msg, node.context(), null, is_json, promises, null));
                    Promise.all(promises).then(function (values) {
                        var value = mustache.render(template, new NodeContext(msg, node.context(), null, is_json, null, values));
                        output(value);
                    }).catch(function (err) {
                        node.error(err.message);
                    });
                } else {
                    output(template);
                }
            }
            catch(err) {
                node.error(err.message);
            }
        });
    }

    RED.nodes.registerType("template",TemplateNode);
    RED.library.register("templates");
}
