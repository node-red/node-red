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
var growl = require('growl');
var imagefile = __dirname+"/../../public/mqtt-node-red.png";

function NotifyNode(n) {
	RED.nodes.createNode(this,n);
	this.title = n.title;
	var node = this;
	this.on("input",function(msg) {
		var titl = this.title||msg.topic;
		if (typeof(msg.payload) == 'object') {
			msg.payload = JSON.stringify(msg.payload);
		}
		if (typeof(titl) != 'undefined') {
			growl(msg.payload, { title: titl, image: imagefile });
		}
		else {
			growl(msg.payload, { image: imagefile });
		}
	});
}

RED.nodes.registerType("notify",NotifyNode);
