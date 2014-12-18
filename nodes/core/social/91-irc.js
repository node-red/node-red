/**
 * Copyright 2013,2014 IBM Corp.
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
        this.lastseen = 0;
        this.ircclient = null;
        this.on("close", function() {
            if (this.ircclient != null) {
                this.ircclient.removeAllListeners();
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
        if (node.serverConfig.ircclient === null) {
            node.log("CONNECT: "+node.serverConfig.server);
            node.status({fill:"grey",shape:"dot",text:"connecting"});
            node.serverConfig.ircclient = new irc.Client(node.serverConfig.server, node.serverConfig.nickname,{autoConnect:true,autoRejoin:false,floodProtection:true,retryDelay:20000});
            node.serverConfig.ircclient.setMaxListeners(0);
            node.serverConfig.ircclient.addListener('error', function(message) {
                if (RED.settings.verbose) { node.log("ERR: "+JSON.stringify(message)); }
            });
            node.serverConfig.ircclient.addListener('netError', function(message) {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("NET: "+JSON.stringify(message)); }
                node.status({fill:"red",shape:"ring",text:"net error"});
            });
            node.serverConfig.ircclient.addListener('connect', function() {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("CONNECTED "); }
            });
            node.serverConfig.ircclient.addListener('registered', function(message) {
                node.serverConfig.lastseen = Date.now();
                node.log(node.serverConfig.ircclient.nick+" ONLINE: "+message.server);
                node.status({fill:"yellow",shape:"dot",text:"connected"});
                node.serverConfig.ircclient.join( node.channel, function(data) {
                    node.log(data+" JOINED: "+node.channel);
                    node.status({fill:"green",shape:"dot",text:"joined"});
                });
            });
            node.serverConfig.ircclient.addListener('ping', function(server) {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("PING from "+JSON.stringify(server)); }
                node.status({fill:"green",shape:"dot",text:"ok"});
            });
            node.serverConfig.ircclient.addListener('quit', function(nick, reason, channels, message) {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("QUIT: "+nick+" "+reason+" "+channels+" "+JSON.stringify(message)); }
                node.status({fill:"grey",shape:"ring",text:"quit"});
                //node.serverConfig.ircclient.disconnect( function() {
                //    node.serverConfig.ircclient.connect();
                //});
                //if (RED.settings.verbose) { node.log("restart"); }          // then retry
            });
            node.serverConfig.ircclient.addListener('raw', function (message) { // any message received means we are alive
                //console.log("RAW:"+JSON.stringify(message));
                if (message.commandType === "reply") {
                    //console.log("RAW:"+JSON.stringify(message));
                    node.serverConfig.lastseen = Date.now();
                }
            });
            node.recon = setInterval( function() {
                //console.log("CHK ",(Date.now()-node.serverConfig.lastseen)/1000);
                if ((Date.now()-node.serverConfig.lastseen) > 240000) {     // if more than 4 mins since last seen
                    node.serverConfig.ircclient.send.apply(node.serverConfig.ircclient,["TIME"]);     // request time to check link
                }
                if ((Date.now()-node.serverConfig.lastseen) > 300000) {     // If more than 5 mins
                    //node.serverConfig.ircclient.disconnect();
                    //node.serverConfig.ircclient.connect();
                    node.status({fill:"grey",shape:"ring",text:"no connection"});
                    if (RED.settings.verbose) { node.log("CONNECTION LOST ?"); }
                }
                //node.serverConfig.ircclient.send.apply(node.serverConfig.ircclient,["TIME"]); // request time to check link
            }, 60000); // check every 1 min
            //node.serverConfig.ircclient.connect();
        }
        else { node.status({text:""}); }
        node.ircclient = node.serverConfig.ircclient;

        node.ircclient.addListener('registered', function(message) {
            //node.log(node.ircclient.nick+" ONLINE");
            node.status({fill:"yellow",shape:"dot",text:"connected"});
            node.ircclient.join( node.channel, function(data) {
                // node.log(data+" JOINED "+node.channel);
                node.status({fill:"green",shape:"dot",text:"joined"});
            });
        });
        node.ircclient.addListener('message', function (from, to, message) {
            //node.log(from + ' => ' + to + ' : ' + message);
            if (~node.channel.toLowerCase().indexOf(to.toLowerCase())) {
                var msg = { "topic":from, "from":from, "to":to, "payload":message };
                node.send([msg,null]);
            }
            //else { console.log(node.channel,to); }
        });
        node.ircclient.addListener('pm', function(from, message) {
            //node.log("PM => "+from + ': ' + message);
            var msg = { "topic":from, "from":from, "to":"PRIV", "payload":message };
            node.send([msg,null]);
        });
        node.ircclient.addListener('join', function(channel, who) {
            var msg = { "payload": { "type":"join", "who":who, "channel":channel } };
            node.send([null,msg]);
            //node.log(who+' has joined '+channel);
        });
        node.ircclient.addListener('invite', function(channel, from, message) {
            var msg = { "payload": { "type":"invite", "who":from, "channel":channel, "message":message } };
            node.send([null,msg]);
            //node.log(from+' sent invite to '+channel+': '+message);
        });
        node.ircclient.addListener('part', function(channel, who, reason) {
            var msg = { "payload": { "type":"part", "who":who, "channel":channel, "reason":reason } };
            node.send([null,msg]);
            //node.log(who+' has left '+channel+': '+reason);
        });
        node.ircclient.addListener('quit', function(nick, reason, channels, message) {
            var msg = { "payload": { "type":"quit", "who":nick, "channel":channels, "reason":reason } };
            node.send([null,msg]);
            //node.log(nick+' has quit '+channels+': '+reason);
        });
        node.ircclient.addListener('kick', function(channel, who, by, reason) {
            var msg = { "payload": { "type":"kick", "who":who, "channel":channel, "by":by, "reason":reason } };
            node.send([null,msg]);
            //node.log(who+' was kicked from '+channel+' by '+by+': '+reason);
        });
        node.ircclient.addListener('names', function (channel, nicks) {
            var msg = { "payload": { "type": "names", "channel": channel, "names": nicks} };
            node.send([null, msg]);
        });
        node.ircclient.addListener('raw', function (message) { // any message means we are alive
            node.serverConfig.lastseen = Date.now();
        });
        node.on("close", function() {
            node.ircclient.removeAllListeners();
            if (node.recon) { clearInterval(node.recon); }
        });
    }
    RED.nodes.registerType("irc in",IrcInNode);


    // The Output Node
    function IrcOutNode(n) {
        RED.nodes.createNode(this,n);
        this.sendFlag = n.sendObject;
        this.ircserver = n.ircserver;
        this.serverConfig = RED.nodes.getNode(this.ircserver);
        this.channel = n.channel || this.serverConfig.channel;
        var node = this;
        if (node.serverConfig.ircclient === null) {
            node.log("CONNECT: "+node.serverConfig.server);
            node.status({fill:"grey",shape:"dot",text:"connecting"});
            node.serverConfig.ircclient = new irc.Client(node.serverConfig.server, node.serverConfig.nickname,{autoConnect:true,autoRejoin:false,floodProtection:true,retryDelay:20000});
            node.serverConfig.ircclient.setMaxListeners(0);
            node.serverConfig.ircclient.addListener('error', function(message) {
                if (RED.settings.verbose) { node.log("ERR: "+JSON.stringify(message)); }
            });
            node.serverConfig.ircclient.addListener('netError', function(message) {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("NET: "+JSON.stringify(message)); }
                node.status({fill:"red",shape:"ring",text:"net error"});
            });
            node.serverConfig.ircclient.addListener('connect', function() {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("CONNECTED "); }
            });
            node.serverConfig.ircclient.addListener('registered', function(message) {
                node.serverConfig.lastseen = Date.now();
                node.log(node.serverConfig.ircclient.nick+" ONLINE: "+message.server);
                node.status({fill:"yellow",shape:"dot",text:"connected"});
                node.serverConfig.ircclient.join( node.channel, function(data) {
                    node.log(data+" JOINED: "+node.channel);
                    node.status({fill:"green",shape:"dot",text:"joined"});
                });
            });
            node.serverConfig.ircclient.addListener('ping', function(server) {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("PING from "+JSON.stringify(server)); }
                node.status({fill:"green",shape:"dot",text:"ok"});
            });
            node.serverConfig.ircclient.addListener('quit', function(nick, reason, channels, message) {
                node.serverConfig.lastseen = Date.now();
                if (RED.settings.verbose) { node.log("QUIT: "+nick+" "+reason+" "+channels+" "+JSON.stringify(message)); }
                node.status({fill:"grey",shape:"ring",text:"quit"});
                //node.serverConfig.ircclient.disconnect( function() {
                //    node.serverConfig.ircclient.connect();
                //});
                //if (RED.settings.verbose) { node.log("restart"); }          // then retry
            });
            node.serverConfig.ircclient.addListener('raw', function (message) { // any message received means we are alive
                //console.log("RAW:"+JSON.stringify(message));
                if (message.commandType === "reply") {
                    //console.log("RAW:"+JSON.stringify(message));
                    node.serverConfig.lastseen = Date.now();
                }
            });
            node.recon = setInterval( function() {
                //console.log("CHK ",(Date.now()-node.serverConfig.lastseen)/1000);
                if ((Date.now()-node.serverConfig.lastseen) > 240000) {     // if more than 4 mins since last seen
                    node.serverConfig.ircclient.send.apply(node.serverConfig.ircclient,["TIME"]);     // request time to check link
                }
                if ((Date.now()-node.serverConfig.lastseen) > 300000) {     // If more than 5 mins
                    //node.serverConfig.ircclient.disconnect();
                    //node.serverConfig.ircclient.connect();
                    node.status({fill:"grey",shape:"ring",text:"no connection"});
                    if (RED.settings.verbose) { node.log("CONNECTION LOST ?"); }
                }
                //node.serverConfig.ircclient.send.apply(node.serverConfig.ircclient,["TIME"]); // request time to check link
            }, 60000); // check every 1 min
            //node.serverConfig.ircclient.connect();
        }
        else { node.status({text:""}); }
        node.ircclient = node.serverConfig.ircclient;

        node.on("input", function(msg) {
            if (Object.prototype.toString.call( msg.raw ) === '[object Array]') {
                if (RED.settings.verbose) { node.log("RAW command:"+msg.raw); }
                node.ircclient.send.apply(node.ircclient,msg.raw);
            }
            else {
                if (msg._topic) { delete msg._topic; }
                var ch = node.channel.split(","); // split on , so we can send to multiple
                if (node.sendFlag == "true") { // override channels with msg.topic
                    if ((msg.hasOwnProperty('topic'))&&(typeof msg.topic === "string")) {
                        ch = msg.topic.split(","); // split on , so we can send to multiple
                    }
                    else { node.warn("msg.topic not set"); }
                }
                for (var c = 0; c < ch.length; c++) {
                    if (node.sendFlag == "false") { // send whole message object to each channel
                        node.ircclient.say(ch[c], JSON.stringify(msg));
                    }
                    else { // send just the payload to each channel
                        if (typeof msg.payload === "object") { msg.payload = JSON.stringify(msg.payload); }
                        node.ircclient.say(ch[c], msg.payload);
                    }
                }
            }
        });

        node.on("close", function() {
            node.ircclient.removeAllListeners();
            if (node.recon) { clearInterval(node.recon); }
        });
    }
    RED.nodes.registerType("irc out",IrcOutNode);
}
