
module.exports = function(RED) {
    "use strict";
    var util = require("util");
    var events = require("events");
    var path = require("path");
    var safeJSONStringify = require("json-stringify-safe");
    var debuglength = RED.settings.debugMaxLength||1000;
    var useColors = RED.settings.debugUseColors || false;
    util.inspect.styles.boolean = "red";

    function DebugNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.complete = (n.complete||"payload").toString();

        if (this.complete === "false") {
            this.complete = "payload";
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
                    sendDebug({id:node.id,name:node.name,topic:msg.topic,msg:msg,_path:msg._path});
                }
            } else {
            // debug user defined msg property
                var property = "payload";
                var output = msg[property];
                if (this.complete !== "false" && typeof this.complete !== "undefined") {
                    property = this.complete;
                    try {
                        output = RED.util.getMessageProperty(msg,this.complete);
                    } catch(err) {
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
                    sendDebug({id:node.id,z:node.z,name:node.name,topic:msg.topic,property:property,msg:output,_path:msg._path});
                }
            }
        });
    }

    RED.nodes.registerType("debug",DebugNode, {
        settings: {
            debugUseColors: {
                value: false,
            },
            debugMaxLength: {
                value: 1000,
            }
        }
    });

    function sendDebug(msg) {
        // don't put blank errors in sidebar (but do add to logs)
        //if ((msg.msg === "") && (msg.hasOwnProperty("level")) && (msg.level === 20)) { return; }
        if (msg.msg instanceof Error) {
            msg.format = "error";
            var errorMsg = {};
            if (msg.msg.name) {
                errorMsg.name = msg.msg.name;
            }
            if (msg.msg.hasOwnProperty('message')) {
                errorMsg.message = msg.msg.message;
            } else {
                errorMsg.message = msg.msg.toString();
            }
            msg.msg = JSON.stringify(errorMsg);
        } else if (msg.msg instanceof Buffer) {
            msg.format = "buffer["+msg.msg.length+"]";
            msg.msg = msg.msg.toString('hex');
            if (msg.msg.length > debuglength) {
                msg.msg = msg.msg.substring(0,debuglength);
            }
        } else if (msg.msg && typeof msg.msg === 'object') {
            try {
                msg.format = msg.msg.constructor.name || "Object";
                // Handle special case of msg.req/res objects from HTTP In node
                if (msg.format === "IncomingMessage" || msg.format === "ServerResponse") {
                    msg.format = "Object";
                }
            } catch(err) {
                msg.format = "Object";
            }
            if (/error/i.test(msg.format)) {
                msg.msg = JSON.stringify({
                    name: msg.msg.name,
                    message: msg.msg.message
                });
            } else {
                var isArray = util.isArray(msg.msg);
                if (isArray) {
                    msg.format = "array["+msg.msg.length+"]";
                    if (msg.msg.length > debuglength) {
                        // msg.msg = msg.msg.slice(0,debuglength);
                        msg.msg = {
                            __encoded__: true,
                            type: "array",
                            data: msg.msg.slice(0,debuglength),
                            length: msg.msg.length
                        }
                    }
                }
                if (isArray || (msg.format === "Object")) {
                    msg.msg = safeJSONStringify(msg.msg, function(key, value) {
                        if (key === '_req' || key === '_res') {
                            value = "[internal]"
                        } else if (value instanceof Error) {
                            value = value.toString()
                        } else if (util.isArray(value) && value.length > debuglength) {
                            value = {
                                __encoded__: true,
                                type: "array",
                                data: value.slice(0,debuglength),
                                length: value.length
                            }
                        } else if (typeof value === 'string') {
                            if (value.length > debuglength) {
                                value = value.substring(0,debuglength)+"...";
                            }
                        } else if (value && value.constructor) {
                            if (value.constructor.name === "Buffer") {
                                value.__encoded__ = true;
                                value.length = value.data.length;
                                if (value.length > debuglength) {
                                    value.data = value.data.slice(0,debuglength);
                                }
                            } else if (value.constructor.name === "ServerResponse") {
                                value = "[internal]"
                            } else if (value.constructor.name === "Socket") {
                                value = "[internal]"
                            }
                        }
                        return value;
                    }," ");
                } else {
                    try { msg.msg = msg.msg.toString(); }
                    catch(e) { msg.msg = "[Type not printable]"; }
                }
            }
        } else if (typeof msg.msg === "boolean") {
            msg.format = "boolean";
            msg.msg = msg.msg.toString();
        } else if (typeof msg.msg === "number") {
            msg.format = "number";
            msg.msg = msg.msg.toString();
        } else if (msg.msg === 0) {
            msg.format = "number";
            msg.msg = "0";
        } else if (msg.msg === null || typeof msg.msg === "undefined") {
            msg.format = (msg.msg === null)?"null":"undefined";
            msg.msg = "(undefined)";
        } else {
            msg.format = "string["+msg.msg.length+"]";
            if (msg.msg.length > debuglength) {
                msg.msg = msg.msg.substring(0,debuglength)+"...";
            }
        }
        // if (msg.msg.length > debuglength) {
        //     msg.msg = msg.msg.substr(0,debuglength) +" ....";
        // }
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
                res.sendStatus(200);
            } else if (state === "disable") {
                node.active = false;
                res.sendStatus(201);
            } else {
                res.sendStatus(404);
            }
        } else {
            res.sendStatus(404);
        }
    });

    // As debug/view/debug-utils.js is loaded via <script> tag, it won't get
    // the auth header attached. So do not use RED.auth.needsPermission here.
    RED.httpAdmin.get("/debug/view/*",function(req,res) {
        var options = {
            root: __dirname + '/lib/debug/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });
};
