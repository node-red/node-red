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
    function CSVNode(n) {
        RED.nodes.createNode(this,n);
        this.template = (n.temp || "").split(",");
        this.sep = (n.sep || ',').replace("\\t","\t").replace("\\n","\n").replace("\\r","\r");
        this.quo = '"';
        this.ret = (n.ret || "\n").replace("\\n","\n").replace("\\r","\r");
        this.winflag = (this.ret === "\r\n");
        this.lineend = "\n";
        this.multi = n.multi || "one";
        this.hdrin = n.hdrin || false;
        this.hdrout = n.hdrout || false;
        this.goodtmpl = true;
        var node = this;

        // pass in an array of column names to be trimed, de-quoted and retrimed
        var clean = function(col) {
            for (var t = 0; t < col.length; t++) {
                col[t] = col[t].trim(); // remove leading and trailing whitespace
                if (col[t].charAt(0) === '"' && col[t].charAt(col[t].length -1) === '"') {
                    // remove leading and trailing quotes (if they exist) - and remove whitepace again.
                    col[t] = col[t].substr(1,col[t].length -2).trim();
                }
            }
            if ((col.length === 1) && (col[0] === "")) { node.goodtmpl = false; }
            else { node.goodtmpl = true; }
            return col;
        }
        node.template = clean(node.template);

        this.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                if (typeof msg.payload == "object") { // convert object to CSV string
                    try {
                        var ou = "";
                        if (node.hdrout) {
                            ou += node.template.join(node.sep) + node.ret;
                        }
                        if (!Array.isArray(msg.payload)) { msg.payload = [ msg.payload ]; }
                        for (var s = 0; s < msg.payload.length; s++) {
                            for (var t=0; t < node.template.length; t++) {

                                // aaargh - resorting to eval here - but fairly contained front and back.
                                var p = RED.util.ensureString(eval("msg.payload[s]."+node.template[t]));

                                if (p === "undefined") { p = ""; }
                                if (p.indexOf(node.sep) != -1) { // add quotes if any "commas"
                                    ou += node.quo + p + node.quo + node.sep;
                                }
                                else if (p.indexOf(node.quo) != -1) { // add double quotes if any quotes
                                    p = p.replace(/"/g, '""');
                                    ou += node.quo + p + node.quo + node.sep;
                                }
                                else { ou += p + node.sep; } // otherwise just add
                            }
                            ou = ou.slice(0,-1) + node.ret; // remove final "comma" and add "newline"
                        }
                        msg.payload = ou;
                        node.send(msg);
                    }
                    catch(e) { node.error(e,msg); }
                }
                else if (typeof msg.payload == "string") { // convert CSV string to object
                    try {
                        var f = true; // flag to indicate if inside or outside a pair of quotes true = outside.
                        var j = 0; // pointer into array of template items
                        var k = [""]; // array of data for each of the template items
                        var o = {}; // output object to build up
                        var a = []; // output array is needed for multiline option
                        var first = true; // is this the first line
                        var line = msg.payload;
                        var tmp = "";

                        // For now we are just going to assume that any \r or \n means an end of line...
                        //   got to be a weird csv that has singleton \r \n in it for another reason...

                        // Now process the whole file/line
                        for (var i = 0; i < line.length; i++) {
                            if ((node.hdrin === true) && first) { // if the template is in the first line
                                if ((line[i] === "\n")||(line[i] === "\r")) { // look for first line break
                                    node.template = clean(tmp.split(node.sep));
                                    first = false;
                                }
                                else { tmp += line[i]; }
                            }
                            else {
                                if (line[i] === node.quo) { // if it's a quote toggle inside or outside
                                    f = !f;
                                    if (line[i-1] === node.quo) { k[j] += '\"'; } // if it's a quotequote then it's actually a quote
                                    //if ((line[i-1] !== node.sep) && (line[i+1] !== node.sep)) { k[j] += line[i]; }
                                }
                                else if ((line[i] === node.sep) && f) { // if we are outside of quote (ie valid separator
                                    if (!node.goodtmpl) { node.template[j] = "col"+(j+1); }
                                    if ( node.template[j] && (node.template[j] !== "") && (k[j] !== "" ) ) {
                                        if ( (k[j].charAt(0) !== "+") && !isNaN(Number(k[j])) ) { k[j] = Number(k[j]); }
                                        o[node.template[j]] = k[j];
                                    }
                                    j += 1;
                                    k[j] = "";
                                }
                                else if (f && ((line[i] === "\n") || (line[i] === "\r"))) { // handle multiple lines
                                    //console.log(j,k,o,k[j]);
                                    if (!node.goodtmpl) { node.template[j] = "col"+(j+1); }
                                    if ( node.template[j] && (node.template[j] !== "") && (k[j] !== "") ) {
                                        if ( (k[j].charAt(0) !== "+") && !isNaN(Number(k[j])) ) { k[j] = Number(k[j]); }
                                        else { k[j].replace(/\r$/,''); }
                                        o[node.template[j]] = k[j];
                                    }
                                    if (JSON.stringify(o) !== "{}") { // don't send empty objects
                                        if (node.multi === "one") {
                                            var newMessage = RED.util.cloneMessage(msg);
                                            newMessage.payload = o;
                                            node.send(newMessage); // either send
                                        }
                                        else { a.push(o); } // or add to the array
                                    }
                                    j = 0;
                                    k = [""];
                                    o = {};
                                }
                                else { // just add to the part of the message
                                    k[j] += line[i];
                                }
                            }
                        }
                        // Finished so finalize and send anything left
                        //console.log(j,k,o,k[j]);
                        if (!node.goodtmpl) { node.template[j] = "col"+(j+1); }
                        if ( node.template[j] && (node.template[j] !== "") && (k[j] !== "") ) {
                            if ( (k[j].charAt(0) !== "+") && !isNaN(Number(k[j])) ) { k[j] = Number(k[j]); }
                            else { k[j].replace(/\r$/,''); }
                            o[node.template[j]] = k[j];
                        }
                        if (JSON.stringify(o) !== "{}") { // don't send empty objects
                            if (node.multi === "one") {
                                var newMessage = RED.util.cloneMessage(msg);
                                newMessage.payload = o;
                                node.send(newMessage); // either send
                            }
                            else { a.push(o); } // or add to the aray
                        }
                        if (node.multi !== "one") {
                            msg.payload = a;
                            node.send(msg); // finally send the array
                        }
                    }
                    catch(e) { node.error(e,msg); }
                }
                else { node.warn("This node only handles csv strings or js objects."); }
            }
            else { node.send(msg); } // If no payload - just pass it on.
        });
    }
    RED.nodes.registerType("csv",CSVNode);
}
