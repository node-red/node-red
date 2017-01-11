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
    var xml2js = require('xml2js');
    var parseString = xml2js.parseString;

    function XMLNode(n) {
        RED.nodes.createNode(this,n);
        this.attrkey = n.attr;
        this.charkey = n.chr;
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                var options;
                if (typeof msg.payload === "object") {
                    options = {renderOpts:{pretty:false}};
                    if (msg.hasOwnProperty("options") && typeof msg.options === "object") { options = msg.options; }
                    options.async = false;
                    var builder = new xml2js.Builder(options);
                    msg.payload = builder.buildObject(msg.payload, options);
                    node.send(msg);
                }
                else if (typeof msg.payload == "string") {
                    options = {};
                    if (msg.hasOwnProperty("options") && typeof msg.options === "object") { options = msg.options; }
                    options.async = true;
                    options.attrkey = node.attrkey || options.attrkey || '$';
                    options.charkey = node.charkey || options.charkey || '_';
                    parseString(msg.payload, options, function (err, result) {
                        if (err) { node.error(err, msg); }
                        else {
                            msg.payload = result;
                            node.send(msg);
                        }
                    });
                }
                else { node.warn(RED._("xml.errors.xml_js")); }
            }
            else { node.send(msg); } // If no payload - just pass it on.
        });
    }
    RED.nodes.registerType("xml",XMLNode);
}
