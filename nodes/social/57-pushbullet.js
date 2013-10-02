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
var PushBullet = require('pushbullet');
var util = require('util');

// Either add a line like this to settings.js
//    pushbullet: {pushbullet:'My-API-KEY', deviceid:'12345'},
// or create pushkey.js in dir ABOVE node-red, it just needs to be like
//    module.exports = {pushbullet:'My-API-KEY', deviceid:'12345'}

try {
	var pushkey = require("../../settings").pushbullet || require("../../../pushkey.js");
}
catch(err) {
	util.log("[57-pushbullet.js] Error: Failed to load PushBullet credentials");
}

if (pushkey) {
	var pusher = new PushBullet(pushkey.pushbullet);
	var deviceId = pushkey.deviceid;
}

function PushbulletNode(n) {
	RED.nodes.createNode(this,n);
	this.title = n.title;
	var node = this;
	this.on("input",function(msg) {
		var titl = this.title||msg.topic||"Node-RED";
		if (typeof(msg.payload) == 'object') {
			msg.payload = JSON.stringify(msg.payload);
		}
		if (pushkey) {
			try {
				pusher.note(deviceId, titl, msg.payload, function(err, response) {
					if (err) node.error(err);
					console.log(response);
				});
			}
			catch (err) {
				node.error(err);
			}
		}
		else {
			node.warn("Pushbullet credentials not set/found. See node info.");
		}
	});
}

RED.nodes.registerType("pushbullet",PushbulletNode);
