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

var RED = require("../../red/red");
var irc = require("irc");
var util = require("util");

// The Server Definition - this opens (and closes) the connection
function IRCServerNode(n) {
	RED.nodes.createNode(this,n);
	this.server = n.server;
	this.channel = n.channel;
	this.nickname = n.nickname;
	this.ircclient = new irc.Client(this.server, this.nickname, {
		channels: [this.channel]
	});
	this.ircclient.addListener('error', function(message) {
		util.log('[irc] '+ JSON.stringify(message));
	});
	this._close = function() {
		this.ircclient.disconnect();
	}
}

RED.nodes.registerType("irc-server",IRCServerNode);
IRCServerNode.prototype.close = function() {
	this._close();
}


// The Input Node
function IrcInNode(n) {
	RED.nodes.createNode(this,n);
	this.ircserver = n.ircserver;
	this.serverConfig = RED.nodes.getNode(this.ircserver);
	this.ircclient = this.serverConfig.ircclient;
	var node = this;

	this.ircclient.addListener('message', function (from, to, message) {
		console.log(from + ' => ' + to + ': ' + message);
		var msg = { "topic":from, "to":to, "payload":message };
		node.send(msg);
	});

}
RED.nodes.registerType("irc in",IrcInNode);

// The Output Node
function IrcOutNode(n) {
	RED.nodes.createNode(this,n);
	this.sendAll = n.sendObject;
	this.ircserver = n.ircserver;
	this.serverConfig = RED.nodes.getNode(this.ircserver);
	this.ircclient = this.serverConfig.ircclient;
	this.channel = this.serverConfig.channel;
	var node = this;

	this.on("input", function(msg) {
		//console.log(msg,node.channel);
		if (node.sendAll) {
			node.ircclient.say(node.channel, JSON.stringify(msg));
		}
		else {
			var to = msg.topic || node.channel;
			node.ircclient.say(to, msg.payload);
		}
	});
}
RED.nodes.registerType("irc out",IrcOutNode);
