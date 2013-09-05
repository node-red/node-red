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
	var node = this;
	try {
		var blink1 = new Blink1.Blink1();
		node.log("started");

		this.on("input", function(msg) {
			if (msg != null) {
				var rgb = msg.payload.split(',');
				// only do it if three parameters...
				if (rgb.length == 3) {
					blink1.setRGB( (rgb[0]*1)&255, (rgb[1]*1)&255, (rgb[2]*1)&255 );
				}
				else {
					//let Andy do fancy colours by name here if he wants...
					node.log("received "+msg.payload);
				}
			}
		});
	}
	catch(e) {
		node.error(e);
	}
}

RED.nodes.registerType("blink",Blink1Node);
