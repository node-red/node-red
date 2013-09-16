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
var util =  require('util');
var fs =  require('fs');

// read from /dev/ledborg to see if it exists - if not then don't even show the node.
try { var rc = fs.readFileSync("/dev/ledborg"); }
catch (err) { util.log("[77-ledborg.js] Error: PiBorg hardware : LedBorg not found"); return; }

function LedBorgNode(n) {
	RED.nodes.createNode(this,n);
	var p1 = /[0-2][0-2][0-2]/
	var p2 = /^\#[A-Fa-f0-9]{6}$/
	var node = this;

	this.on("input", function(msg) {
		if (p1.test(msg.payload)) {
			fs.writeFile('/dev/ledborg', msg.payload, function (err) {
				if (err) node.warn(msg.payload+" : No LedBorg found");
			});
		}
		if (p2.test(msg.payload)) {
			var r = Math.floor(parseInt(msg.payload.slice(1,3),16)/88).toString();
			var g = Math.floor(parseInt(msg.payload.slice(3,5),16)/88).toString();
			var b = Math.floor(parseInt(msg.payload.slice(5),16)/88).toString();
			fs.writeFile('/dev/ledborg', r+g+b, function (err) {
				if (err) node.warn(r+g+b+" : No LedBorg found");
			});
		}
		else {
			node.warn("Invalid LedBorg colour code");
		}
	});
}

RED.nodes.registerType("ledborg",LedBorgNode);
