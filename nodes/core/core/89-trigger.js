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
    var mustache = require("mustache");
    function TriggerNode(n) {
        RED.nodes.createNode(this,n);
        this.op1 = n.op1 || "1";
        this.op2 = n.op2 || "0";
        this.op1type = n.op1type || "val";
        this.op2type = n.op2type || "val";
        this.extend = n.extend || "false";
        this.units = n.units || "ms";
        this.duration = n.duration || 250;
        if (this.duration <= 0) { this.duration = 0; }
        else {
            if (this.units == "s") { this.duration = this.duration * 1000; }
            if (this.units == "min") { this.duration = this.duration * 1000 * 60; }
            if (this.units == "hr") { this.duration = this.duration * 1000 *60 * 60; }
        }
        this.op1Templated = this.op1.indexOf("{{") != -1;
        this.op2Templated = this.op2.indexOf("{{") != -1;
        if (!isNaN(this.op1)) { this.op1 = Number(this.op1); }
        if (!isNaN(this.op2)) { this.op2 = Number(this.op2); }
        if (this.op1 == "true") { this.op1 = true; }
        if (this.op2 == "true") { this.op2 = true; }
        if (this.op1 == "false") { this.op1 = false; }
        if (this.op2 == "false") { this.op2 = false; }
        if (this.op1 == "null") { this.op1 = null; }
        if (this.op2 == "null") { this.op2 = null; }
        try { this.op1 = JSON.parse(this.op1); }
        catch(e) { this.op1 = this.op1; }
        try { this.op2 = JSON.parse(this.op2); }
        catch(e) { this.op2 = this.op2; }

        var node = this;
        var tout = null;
        var m2;
        this.on("input", function(msg) {
            if (msg.hasOwnProperty("reset")) {
                clearTimeout(tout);
                tout = null;
            }
            else {
                if (!tout) {
                    if (node.op2type === "pay") { m2 = msg.payload; }
                    else if (node.op2Templated) { m2 = mustache.render(node.op2,msg); }
                    else { m2 = node.op2; }
                    if (node.op1type === "pay") { }
                    else if (node.op1Templated) { msg.payload = mustache.render(node.op1,msg); }
                    else { msg.payload = node.op1; }
                    if (node.op1type !== "nul") { node.send(msg); }
                    if (node.duration === 0) { tout = "infinite"; }
                    else {
                        tout = setTimeout(function() {
                            msg.payload = m2;
                            if (node.op2type !== "nul") { node.send(msg); }
                            tout = null;
                        },node.duration);
                    }
                }
                else if ((node.extend == "true") && (node.duration > 0)) {
                    clearTimeout(tout);
                    tout = setTimeout(function() {
                        msg.payload = m2;
                        if (node.op2type !== "nul") { node.send(msg); }
                        tout = null;
                    },node.duration);
                }
            }
        });
        this.on("close", function() {
            if (tout) { clearTimeout(tout); }
        });
    }
    RED.nodes.registerType("trigger",TriggerNode);
}
