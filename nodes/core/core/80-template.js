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


    /**
     * Custom Mustache Context capable to resolve message property and node
     * flow and global context
     */
    function NodeContext(msg, nodeContext, parent, escapeStrings) {
        this.msgContext = new mustache.Context(msg,parent);
        this.nodeContext = nodeContext;
        this.escapeStrings = escapeStrings;
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

            // try node context:
            var dot = name.indexOf(".");
            if (dot > 0) {
                var contextName = name.substr(0, dot);
                var variableName = name.substr(dot + 1);

                if (contextName === "flow" && this.nodeContext.flow) {
                    return this.nodeContext.flow.get(variableName);
                }
                else if (contextName === "global" && this.nodeContext.global) {
                    return this.nodeContext.global.get(variableName);
                }
            }
        }catch(err) {
            throw err;
        }
    }

    NodeContext.prototype.push = function push (view) {
        return new NodeContext(view, this.nodeContext,this.msgContext);
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
            try {
                var value;
                /***
                * Allow template contents to be defined externally
                * through inbound msg.template IFF node.template empty
                */
                if (msg.hasOwnProperty("template")) {
                    if (node.template == "" || node.template === null) {
                        node.template = msg.template;
                    }
                }

                if (node.syntax === "mustache") {
                    if (node.outputFormat === "json") {
                        value = mustache.render(node.template,new NodeContext(msg, node.context(), null, true));
                    } else {
                        value = mustache.render(node.template,new NodeContext(msg, node.context(), null, false));
                    }
                } else {
                    value = node.template;
                }
                if (node.outputFormat === "json") {
                    value = JSON.parse(value);
                }
                if (node.outputFormat === "yaml") {
                    value = yaml.load(value);
                }

                if (node.fieldType === 'msg') {
                    RED.util.setMessageProperty(msg,node.field,value);
                } else if (node.fieldType === 'flow') {
                    node.context().flow.set(node.field,value);
                } else if (node.fieldType === 'global') {
                    node.context().global.set(node.field,value);
                }
                node.send(msg);
            } catch(err) {
                node.error(err.message);
            }
        });
    }

    RED.nodes.registerType("template",TemplateNode);
    RED.library.register("templates");
}
