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

var RED = require(process.env.NODE_RED_HOME+"/red/red");

var util = require("util");
var ws = require('ws');
var events = require("events");
var debuglength = RED.settings.debugMaxLength||1000;

function DebugNode(n) {
	RED.nodes.createNode(this,n);
	this.name = n.name;
	this.complete = n.complete;
	this.active = (n.active == null)||n.active;

	this.on("input",function(msg) {
		if (this.active) {
			if (msg.payload instanceof Buffer) {
				msg.payload = "(Buffer) "+msg.payload.toString();
			}
			if (this.complete == "true") {
				DebugNode.send({id:this.id,name:this.name,topic:msg.topic,msg:msg,_path:msg._path});
			} else {
				if (typeof msg.payload !== "undefined") {
					DebugNode.send({id:this.id,name:this.name,topic:msg.topic,msg:msg.payload,_path:msg._path});
				}
			}
		}
	});
}

RED.nodes.registerType("debug",DebugNode);

DebugNode.send = function(msg) {
	if (msg.msg instanceof Error) {
		msg.msg = msg.msg.toString();
	}
	else if (typeof msg.msg === 'object') {
		var seen = [];
		msg.msg = "(Object) " + JSON.stringify(msg.msg, function(key, value) {
			if (typeof value === 'object' && value !== null) {
				if (seen.indexOf(value) !== -1) { return "[circular]"; }
				seen.push(value);
			}
			return value;
		}," ");
		seen = null;
	}
	else if (typeof msg.msg === "boolean") msg.msg = "(boolean) "+msg.msg.toString();
	else if (msg.msg === 0) msg.msg = "0";

	if (msg.msg.length > debuglength) {
		msg.msg = msg.msg.substr(0,debuglength) +" ....";
	}

	for (var i in DebugNode.activeConnections) {
		var ws = DebugNode.activeConnections[i];
		try {
			var p = JSON.stringify(msg);
			ws.send(p);
		} catch(err) {
			util.log("[debug] ws error : "+err);
		}
	}
}

DebugNode.activeConnections = [];

var path = RED.settings.httpAdminRoot || "/";
path = path + (path.slice(-1) == "/" ? "":"/") + "debug/ws";

DebugNode.wsServer = new ws.Server({server:RED.server,path:path});
DebugNode.wsServer.on('connection',function(ws) {
	DebugNode.activeConnections.push(ws);
	ws.on('close',function() {
		for (var i in DebugNode.activeConnections) {
			if (DebugNode.activeConnections[i] === ws) {
				DebugNode.activeConnections.splice(i,1);
				break;
			}
		}
	});
});

DebugNode.logHandler = new events.EventEmitter();
DebugNode.logHandler.on("log",function(msg) {
	if (msg.level == "warn" || msg.level == "error") {
		DebugNode.send(msg);
	}
});
RED.nodes.addLogHandler(DebugNode.logHandler);

RED.httpAdmin.post("/debug/:id/:state", function(req,res) {
	var node = RED.nodes.getNode(req.params.id);
	var state = req.params.state;
	if (node != null) {
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
