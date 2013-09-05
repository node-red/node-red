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

// pushkey.js just needs to be like (with the quotes)
// module.exports = {pushbullet:'My-API-KEY', deviceid:'12345'}

try {
	var pushkey = require("../../settings").pushbullet || require("../../../pushkey.js");
} catch(err) {
	throw new Error("Failed to load PushBullet credentials");
}

var pusher = new PushBullet(pushkey.pushbullet);
var deviceId = pushkey.deviceid;

function PushbulletNode(n) {
	RED.nodes.createNode(this,n);
	this.title = n.title;
	this.device
	var node = this;
	this.on("input",function(msg) {
		var titl = this.title||msg.topic||"Node-RED";
		if (typeof(msg.payload) == 'object') {
			msg.payload = JSON.stringify(msg.payload);
		}
		try {
			pusher.note(deviceId, titl, msg.payload, function(err, response) {
				if ( err ) node.error(err);
				node.log( JSON.stringify(response) );
			});
		}
		catch (err) {
			node.error(err);
		}
	});
}

RED.nodes.registerType("pushbullet",PushbulletNode);
