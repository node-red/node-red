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
    var mustache = require("mustache");

    function TemplateNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.field = n.field || "payload";
        this.template = n.template;
        var node = this;

        var b = node.field.split(".");
        var i = 0;
        var m = null;
        var rec = function(obj) {
            i += 1;
            if ((i < b.length) && (typeof obj[b[i-1]] === "object")) {
                rec(obj[b[i-1]]); // not there yet - carry on digging
            }
            else {
                 if (i === b.length) { // we've finished so assign the value
                     obj[b[i-1]] = mustache.render(node.template,m);
                     node.send(m);
                 }
                 else {
                     obj[b[i-1]] = {}; // needs to be a new object so create it
                     rec(obj[b[i-1]]); // and carry on digging
                 }
            }
        }

        node.on("input", function(msg) {
            try {
                m = msg;
                i = 0;
                rec(msg);
            } catch(err) {
                node.error(err.message);
            }
        });
    }

    RED.nodes.registerType("template",TemplateNode);
    RED.library.register("templates");
}
