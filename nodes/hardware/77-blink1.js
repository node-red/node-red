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
var Blink1 = require("node-blink1");

function Blink1Node(n) {
	RED.nodes.createNode(this,n);
	this.fade = n.fade||0;
	var node = this;

	try {
		var p1 = /^\#[A-Za-z0-9]{6}$/
		var p2 = /[0-9]+,[0-9]+,[0-9]+/
		this.on("input", function(msg) {
			if (blink1) {
				if (p1.test(msg.payload)) {
					// if it is a hex colour string
					var r = parseInt(msg.payload.slice(1,3),16);
					var g = parseInt(msg.payload.slice(3,5),16);
					var b = parseInt(msg.payload.slice(5),16);
					if (node.fade == 0) { blink1.setRGB( r, g, b ); }
					else { blink1.fadeToRGB(node.fade, r, g, b ); }
				}
				else if (p2.test(msg.payload)) {
					// if it is a r,g,b triple
					var rgb = msg.payload.split(',');
					if (node.fade == 0) { blink1.setRGB(parseInt(rgb[0])&255, parseInt(rgb[1])&255, parseInt(rgb[2])&255); }
					else { blink1.fadeToRGB(node.fade, parseInt(rgb[0])&255, parseInt(rgb[1])&255, parseInt(rgb[2])&255); }
				}
				else {
					// you can do fancy colours by name here if you want...
					node.warn("Blink1 : invalid msg : "+msg.payload);
				}
			}
			else {
				node.warn("No Blink1 found");
			}
		});
		var blink1 = new Blink1.Blink1();
	}
	catch(e) {
		node.error("no Blink1 found");
	}
}

RED.nodes.registerType("blink1",Blink1Node);
