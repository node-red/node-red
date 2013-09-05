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
var xmpp = require('simple-xmpp');

try {
	var xmppkey = require("../../settings").xmpp || require("../../../xmppkeys.js");
} catch(err) {
	throw new Error("Failed to load XMPP credentials");
}

function XmppNode(n) {
	RED.nodes.createNode(this,n);
	this.server = n.server;
	this.port = n.port;
	this.join = n.join || false;
	this.nick = n.nick || "Node-RED";
	this.sendAll = n.sendObject;
	this.to = n.to || "";
	var node = this;

	setTimeout(function() {
		xmpp.connect({
			jid			: xmppkey.jid,
			password	: xmppkey.password,
			host		: this.server,
			port		: this.port,
			skipPresence : true,
			reconnect : false
		});
	}, 5000);

	xmpp.on('online', function() {
		node.log('connected to '+node.server);
		xmpp.setPresence('online', node.nick+' online');
		if (node.join) {
			xmpp.join(node.to+'/'+node.nick);
		}
	});

	xmpp.on('chat', function(from, message) {
		var msg = { topic:from, payload:message };
		node.send([msg,null]);
	});

	xmpp.on('groupchat', function(conference, from, message, stamp) {
		var msg = { topic:from, payload:message, room:conference };
		if (from != node.nick) { node.send([msg,null]); }
	});

	//xmpp.on('chatstate', function(from, state) {
		//console.log('%s is currently %s', from, state);
		//var msg = { topic:from, payload:state };
		//node.send([null,msg]);
	//});

	xmpp.on('buddy', function(jid, state, statusText) {
		node.log(jid+" is "+state+" : "+statusText);
		var msg = { topic:jid, payload: { presence:state, status:statusText} };
		node.send([null,msg]);
	});

	xmpp.on('error', function(err) {
		console.error(err);
	});

	xmpp.on('close', function(err) {
		node.log('connection closed');
	});

	xmpp.on('subscribe', function(from) {
		xmpp.acceptSubscription(from);
	});

	this.on("input", function(msg) {
		var to = msg.topic;
		if (node.to != "") { to = node.to; }
		if (node.sendAll) {
			xmpp.send(to, JSON.stringify(msg), node.join);
		}
		else {
			xmpp.send(to, msg.payload, node.join);
		}
	});

	this._close = function() {
		xmpp.setPresence('offline');
		//xmpp.conn.end();
		// TODO - DCJ NOTE... this is not good. It leaves the connection up over a restart - which will end up with bad things happening...
		// (but requires the underlying xmpp lib to be fixed (which does have an open bug request on fixing the close method)).
		this.warn("Due to an underlying bug in the xmpp library this does not disconnect old sessions. This is bad... A restart would be better.");
	}
}

RED.nodes.registerType("xmpp",XmppNode);

XmppNode.prototype.close = function() {
	this._close();
}
