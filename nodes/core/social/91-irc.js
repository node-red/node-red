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
    var irc = require("irc");

    // The Server Definition - this opens (and closes) the connection
    function IRCServerNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.channel = n.channel;
        this.nickname = n.nickname;
        this.ircclient = null;
        this.on("close", function() {
            if (this.ircclient != null) {
                this.ircclient.disconnect();
            }
        });
    }
    RED.nodes.registerType("irc-server",IRCServerNode);


    // The Input Node
    function IrcInNode(n) {
        RED.nodes.createNode(this,n);
        this.ircserver = n.ircserver;
        this.serverConfig = RED.nodes.getNode(this.ircserver);
        this.channel = n.channel || this.serverConfig.channel;
        var node = this;
        if (node.serverConfig.ircclient == null) {
            node.log("Connecting to "+node.serverConfig.server);
            node.serverConfig.ircclient = new irc.Client(node.serverConfig.server, node.serverConfig.nickname);
            node.serverConfig.ircclient.addListener('error', function(message) {
                node.log(JSON.stringify(message));
            });
        }
        node.ircclient = node.serverConfig.ircclient;


        node.ircclient.addListener('registered', function(message) {
            node.log(node.ircclient.nick+" ONLINE");
            node.ircclient.join( node.channel, function(data) {
                // node.log(data+" JOINED "+node.channel);
            });
        });
        node.ircclient.addListener('message', function (from, to, message) {
            //node.log(from + ' => ' + to + ' : ' + message);
            if (node.channel.indexOf(to) > -1) {
                var msg = { "topic":from, "from":from, "to":to, "payload":message };
                node.send([msg,null]);
            }
        });
        node.ircclient.addListener('pm', function(from, message) {
            //node.log("PM => "+from + ': ' + message);
            var msg = { "topic":from, "from":from, "to":"PRIV", "payload":message };
            node.send([msg,null]);
        });
        node.ircclient.addListener('join', function(channel, who) {
            var msg = { "payload": { "type":"join", "who":who, "channel":channel } };
            node.send([null,msg]);
            node.log(who+' has joined '+channel);
        });
        node.ircclient.addListener('invite', function(channel, from, message) {
            var msg = { "payload": { "type":"invite", "who":from, "channel":channel, "message":message } };
            node.send([null,msg]);
            node.log(from+' sent invite to '+channel+': '+message);
        });
        node.ircclient.addListener('part', function(channel, who, reason) {
            var msg = { "payload": { "type":"part", "who":who, "channel":channel, "reason":reason } };
            node.send([null,msg]);
            node.log(who+' has left '+channel+': '+reason);
        });
        node.ircclient.addListener('quit', function(nick, reason, channels, message) {
            var msg = { "payload": { "type":"quit", "who":nick, "channel":channels, "reason":reason } };
            node.send([null,msg]);
            node.log(nick+' has quit '+channels+': '+reason);
        });
        node.ircclient.addListener('kick', function(channel, who, by, reason) {
            var msg = { "payload": { "type":"kick", "who":who, "channel":channel, "by":by, "reason":reason } };
            node.send([null,msg]);
            node.log(who+' was kicked from '+channel+' by '+by+': '+reason);
        });
        node.ircclient.addListener('names', function (channel, nicks) {
            var msg = { "payload": { "type": "names", "channel": channel, "names": nicks} };
            node.send([null, msg]);
        });

    }
    RED.nodes.registerType("irc in",IrcInNode);


    // The Output Node
    function IrcOutNode(n) {
        RED.nodes.createNode(this,n);
        this.sendAll = n.sendObject;
        this.ircserver = n.ircserver;
        this.serverConfig = RED.nodes.getNode(this.ircserver);
        this.channel = n.channel || this.serverConfig.channel;
        var node = this;
        if (node.serverConfig.ircclient == null) {
            node.log("Connecting to "+node.serverConfig.server);
            node.serverConfig.ircclient = new irc.Client(node.serverConfig.server, node.serverConfig.nickname);
            node.serverConfig.ircclient.addListener('error', function(message) {
                node.log(JSON.stringify(message));
            });
        }
        node.ircclient = node.serverConfig.ircclient;

        node.ircclient.addListener('registered', function(message) {
            node.log(node.ircclient.nick+" ONLINE");
            node.ircclient.join( node.channel, function(data) {
                //node.log(data+" JOINED "+node.channel);
            });
        });

        node.on("input", function(msg) {
            if (Object.prototype.toString.call( msg.raw ) === '[object Array]') {
                var m = msg.raw;
                for (var i = 0; i < 10; i++) {
                    if (typeof m[i] !== "string") { m[i] = ""; }
                    m[i] = m[i].replace(/"/g, "");
                }
                node.log("RAW command:"+m);
                node.ircclient.send(m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7],m[8],m[9]);
            }
            else {
                if (msg._topic) { delete msg._topic; }
                var ch = node.channel.split(",");
                for (var c=0; c<ch.length; c++) {
                    if (node.sendAll == "false") {
                        node.ircclient.say(ch[c], JSON.stringify(msg));
                    }
                    else {
                        if (typeof msg.payload === "object") { msg.payload = JSON.stringify(msg.payload); }
                        if (node.sendAll == "pay") {
                            node.ircclient.say(ch[c], msg.payload);
                        }
                        else {
                            var to = msg.topic || ch[c];
                            node.ircclient.say(to, msg.payload);
                        }
                    }
                }
            }
        });
    }
    RED.nodes.registerType("irc out",IrcOutNode);
}
