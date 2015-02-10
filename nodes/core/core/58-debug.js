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
    var util = require("util");
    var events = require("events");
    var debuglength = RED.settings.debugMaxLength||1000;
    var useColors = false;
    // util.inspect.styles.boolean = "red";

    function DebugNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.complete = n.complete||"payload";

        if (this.complete === "false") {
            this.complete = "payload";
        }
        if (this.complete === true) {
            this.complete = "true";
        }

        this.console = n.console;
        this.active = (n.active === null || typeof n.active === "undefined") || n.active;
        var node = this;

        this.on("input",function(msg) {
            if (this.complete === "true") {
            // debug complete msg object
                if (this.console === "true") {
                    node.log("\n"+util.inspect(msg, {colors:useColors, depth:10}));
                }
                if (this.active) {
                    sendDebug({id:this.id,name:this.name,topic:msg.topic,msg:msg,_path:msg._path});
                }
            } else {
            // debug user defined msg property
                var property = "payload";
                var output = msg[property];
                if (this.complete !== "false" && typeof this.complete !== "undefined") {
                    property = this.complete;
                    var propertyParts = property.split(".");
                    try {
                        output = propertyParts.reduce(function (obj, i) {
                            return obj[i];
                        }, msg);
                    } catch (err) {
                        output = undefined;
                    }
                }
                if (this.console === "true") {
                    if (typeof output === "string") {
                        node.log((output.indexOf("\n") !== -1 ? "\n" : "") + output);
                    } else if (typeof output === "object") {
                        node.log("\n"+util.inspect(output, {colors:useColors, depth:10}));
                    } else {
                        node.log(util.inspect(output, {colors:useColors}));
                    }
                }
                if (this.active) {
                    sendDebug({id:this.id,name:this.name,topic:msg.topic,property:property,msg:output,_path:msg._path});
                }
            }
        });
    }

    RED.nodes.registerType("debug",DebugNode);

    function sendDebug(msg) {
        if (msg.msg instanceof Error) {
            msg.msg = msg.msg.toString();
        } else if (msg.msg instanceof Buffer) {
            msg.msg = "(Buffer) "+msg.msg.toString('hex');
        } else if (typeof msg.msg === 'object') {
            var seen = [];
            var ty = "(Object) ";
            if (util.isArray(msg.msg)) { ty = "(Array) "; }
            msg.msg = ty + JSON.stringify(msg.msg, function(key, value) {
                if (typeof value === 'object' && value !== null) {
                    if (seen.indexOf(value) !== -1) { return "[circular]"; }
                    seen.push(value);
                }
                return value;
            }," ");
            seen = null;
        } else if (typeof msg.msg === "boolean") {
            msg.msg = "(boolean) "+msg.msg.toString();
        } else if (typeof msg.msg === "number") {
            msg.msg = "(number) "+msg.msg.toString();
        } else if (msg.msg === 0) {
            msg.msg = "0";
        } else if (msg.msg === null || typeof msg.msg === "undefined") {
            msg.msg = "(undefined)";
        } else { msg.msg = "(string) "+msg.msg; }

        if (msg.msg.length > debuglength) {
            msg.msg = msg.msg.substr(0,debuglength) +" ....";
        }

        RED.comms.publish("debug",msg);
    }

    DebugNode.logHandler = new events.EventEmitter();
    DebugNode.logHandler.on("log",function(msg) {
        if (msg.level === RED.log.WARN || msg.level === RED.log.ERROR) {
            sendDebug(msg);
        }
    });
    RED.log.addHandler(DebugNode.logHandler);

    RED.httpAdmin.post("/debug/:id/:state", RED.auth.needsPermission("debug.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        var state = req.params.state;
        if (node !== null && typeof node !== "undefined" ) {
            if (state === "enable") {
                node.active = true;
                res.send(200);
            } else if (state === "disable") {
                node.active = false;
                res.send(201);
            } else {
                res.send(404);
            }
        } else {
            res.send(404);
        }
    });
};
