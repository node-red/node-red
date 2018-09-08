
module.exports = function(RED) {
    "use strict";
    var util = require("util");
    var events = require("events");
    var path = require("path");
    var debuglength = RED.settings.debugMaxLength || 1000;
    var useColors = RED.settings.debugUseColors || false;
    util.inspect.styles.boolean = "red";

    function DebugNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.complete = (n.complete||"payload").toString();
        if (this.complete === "false") { this.complete = "payload"; }
        this.console = ""+(n.console || false);
        this.tostatus = n.tostatus || false;
        this.tosidebar = n.tosidebar;
        if (this.tosidebar === undefined) { this.tosidebar = true; }
        this.severity = n.severity || 40;
        this.active = (n.active === null || typeof n.active === "undefined") || n.active;
        if (this.tostatus) {
            this.oldStatus = {fill:"grey", shape:"ring"};
            this.status(this.oldStatus);
        }
        else { this.status({}); }

        var node = this;
        var levels = {
            off: 1,
            fatal: 10,
            error: 20,
            warn: 30,
            info: 40,
            debug: 50,
            trace: 60,
            audit: 98,
            metric: 99
        };
        var colors = {
            "0": "grey",
            "10": "grey",
            "20": "red",
            "30": "yellow",
            "40": "grey",
            "50": "green",
            "60": "blue"
        };

        this.on("input",function(msg) {
            if (this.complete === "true") {
                // debug complete msg object
                if (this.console === "true") {
                    node.log("\n"+util.inspect(msg, {colors:useColors, depth:10}));
                }
                if (this.active && this.tosidebar) {
                    sendDebug({id:node.id, name:node.name, topic:msg.topic, msg:msg, _path:msg._path});
                }
            }
            else {
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
                    if (this.tosidebar == true) {
                        sendDebug({id:node.id, z:node.z, name:node.name, topic:msg.topic, property:property, msg:output, _path:msg._path});
                    }
                    if (this.tostatus === true) {
                        var st = util.inspect(output);
                        if (st.length > 32) { st = st.substr(0,32) + "..."; }
                        node.oldStatus = {fill:colors[node.severity], shape:"dot", text:st};
                        node.status(node.oldStatus);
                    }
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
        msg = RED.util.encodeObject(msg,{maxLength:debuglength});
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
                if (node.tostatus) { node.status({fill:"grey", shape:"dot"}); }
            } else if (state === "disable") {
                node.active = false;
                res.sendStatus(201);
                if (node.tostatus && node.hasOwnProperty("oldStatus")) {
                    node.oldStatus.shape = "dot";
                    node.status(node.oldStatus);
                }
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
