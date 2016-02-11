/**
 * Copyright 2013, 2016 IBM Corp.
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

    function TemplateNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.field = n.field || "payload";
        this.template = n.template;
        this.syntax = n.syntax || "mustache";
        this.fieldType = n.fieldType || "msg";

        var node = this;
        node.on("input", function(msg) {
            try {
                var value;
                if (node.syntax === "mustache") {
                    value = mustache.render(node.template,msg);
                } else {
                    value = node.template;
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
