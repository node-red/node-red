/**
 * Copyright 2014 IBM Corp.
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
        this.tag = n.tag || "h1";
        this.ret = n.ret || "html";
        this.as = n.as || "single";
        var node = this;
        this.on("input", function(msg) {
            try {
                var $ = cheerio.load(msg.payload);
                var pay = [];
                $(node.tag).each(function() {
                    if (node.as === "multi") {
                        var pay2 = null;
                        if (node.ret === "html") { pay2 = $(this).html(); }
                        if (node.ret === "text") { pay2 = $(this).text(); }
                        //if (node.ret === "attr") { pay2 = $(this)[0]["attribs"]; }
                        //if (node.ret === "val")  { pay2 = $(this).val(); }
                        if (pay2) {
                            msg.payload = pay2;
                            node.send(msg);
                        }
                    }
                    if (node.as === "single") {
                        if (node.ret === "html") { pay.push( $(this).html() ); }
                        if (node.ret === "text") { pay.push( $(this).text() ); }
                        //if (node.ret === "attr") { pay.push( $(this)[0]["attribs"] ); }
                        //if (node.ret === "val")  { pay.push( $(this).val() ); }
                    }
                });
                if ((node.as === "single") && (pay.length !== 0)) {
                    msg.payload = pay;
                    node.send(msg);
                }
            } catch (error) {
                node.error('Error: '+error.message);
            }
        });
    }
    RED.nodes.registerType("html",CheerioNode);
}
