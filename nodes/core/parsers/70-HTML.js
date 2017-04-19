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
    var cheerio = require('cheerio');

    function CheerioNode(n) {
        RED.nodes.createNode(this,n);
        this.tag = n.tag;
        this.ret = n.ret || "html";
        this.as = n.as || "single";
        var node = this;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("select")) {
                this.tag = msg.select;
            }
            if (msg.hasOwnProperty("payload")) {
                var tag = node.tag;
                if (msg.hasOwnProperty("select")) { tag = node.tag || msg.select; }
                try {
                    var $ = cheerio.load(msg.payload);
                    var pay = [];
                    $(tag).each(function() {
                        if (node.as === "multi") {
                            var pay2 = null;
                            if (node.ret === "html") { pay2 = cheerio.load($(this).html().trim()).xml(); }
                            if (node.ret === "text") { pay2 = $(this).text(); }
                            if (node.ret === "attr") { pay2 = this.attribs; }
                            //if (node.ret === "val")  { pay2 = $(this).val(); }
                            /* istanbul ignore else */
                            if (pay2) {
                                msg.payload = pay2;
                                node.send(msg);
                            }
                        }
                        if (node.as === "single") {
                            if (node.ret === "html") { pay.push( cheerio.load($(this).html().trim()).xml() ); }
                            if (node.ret === "text") { pay.push( $(this).text() ); }
                            if (node.ret === "attr") { pay.push( this.attribs ); }
                            //if (node.ret === "val")  { pay.push( $(this).val() ); }
                        }
                    });
                    if ((node.as === "single") && (pay.length !== 0)) {
                        msg.payload = pay;
                        node.send(msg);
                    }
                } catch (error) {
                    node.error(error.message,msg);
                }
            }
            else { node.send(msg); } // If no payload - just pass it on.
        });
    }
    RED.nodes.registerType("html",CheerioNode);
}
