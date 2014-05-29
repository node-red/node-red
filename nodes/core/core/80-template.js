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
    var util = require("util");
    var fs = require('fs');

    function TemplateNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.template = n.template;
        this.on("input", function(msg) {
            if (msg != null) {
                try {
                    msg.payload = mustache.render(this.template,msg)
                    this.send(msg);
                } catch(err) {
                    this.error(err.message);
                }
            }
        });
    }

    RED.nodes.registerType("template",TemplateNode);
    RED.library.register("templates");
}
