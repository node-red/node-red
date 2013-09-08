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
var blinkstick = require("blinkstick");

function BlinkStick(n) {
	RED.nodes.createNode(this,n);
	var node = this;
	var p1 = /^#.*/
	var p2 = /[0-9]+,[0-9]+,[0-9]+/

	var led = new blinkstick.findFirst();

	node.log("started");
	this.on("input", function(msg) {
		if (msg != null) {
			if (led.length > 0) {
				if ((p1.test(msg.payload))|(p2.test(msg.payload))) {
					led.setColor(msg.payload);
				}
				else {
					node.error("Incorrect format: "+msg.payload);
				}
			}
			else {
				node.error("No BlinkStick found");
			}
		}
	});

}

RED.nodes.registerType("blinkstick",BlinkStick);
