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
var Prowl = require('node-prowl');
var util = require('util');

// Either add a line like this to settings.js
//    prowl: {prowlkey:'My-API-KEY'},
// or create pushkey.js in dir ABOVE node-red, it just needs to be like
//    module.exports = {prowlkey:'My-API-KEY'}

try {
	var pushkey = require("../../settings").prowl || require("../../../pushkey.js");
}
catch(err) {
	util.log("[57-prowl.js] Error: Failed to load Prowl credentials");
}

if (pushkey) {
	var prowl = new Prowl(pushkey.prowlkey);
}

function ProwlNode(n) {
	RED.nodes.createNode(this,n);
	this.title = n.title;
	this.priority = n.priority * 1;
	if (this.priority > 2) this.priority = 2;
	if (this.priority < -2) this.priority = -2;
	var node = this;
	this.on("input",function(msg) {
		var titl = this.title||msg.topic||"Node-RED";
		var pri = msg.priority||this.priority;
		if (typeof(msg.payload) == 'object') {
			msg.payload = JSON.stringify(msg.payload);
		}
		if (pushkey) {
			try {
				prowl.push(msg.payload, titl, { priority: pri }, function(err, remaining) {
					if (err) node.error(err);
					node.log( remaining + ' calls to Prowl api during current hour.' );
				});
			}
			catch (err) {
				node.error(err);
			}
		}
		else {
			node.warn("Prowl credentials not set/found. See node info.");
		}
	});
}

RED.nodes.registerType("prowl",ProwlNode);
