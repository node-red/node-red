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
var notify = require("fs.notify");

function WatchNode(n) {
	RED.nodes.createNode(this,n);

	this.files = n.files.split(",");
	for (var f in this.files) {
		this.files[f] = this.files[f].trim();
	}
	var node = this;
	var notifications = new notify(this.files);
	notifications.on('change', function (file) {
		node.log('file changed '+file);
		var msg = { payload: file, topic: JSON.stringify(node.files) };
		node.send(msg);
	});

	this._close = function() {
		notifications.close();
	}
}

RED.nodes.registerType("watch",WatchNode);

WatchNode.prototype.close = function() {
	this._close();
}

