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
var reConnect = RED.settings.socketReconnectTime||10000;
var net = require('net');

function TcpIn(n) {
	RED.nodes.createNode(this,n);
	this.host = n.host;
	this.port = n.port * 1;
	this.topic = n.topic;
	this.base64 = n.base64;
	this.server = n.server;
	var node = this;

	if (!node.server) {
		var client;
		var to;

		function setupTcpClient() {
			node.log('connecting to port '+node.port);
			client = net.connect(node.port, node.host, function() {
				node.log("input connected to "+node.host+":"+node.port);
			});

			client.on('data', function (data) {
				var msg;
				if (node.base64) { msg = { topic:node.topic, payload:new Buffer(data).toString('base64') }; }
				else { msg = {topic:node.topic, payload:data}; }
				node.send(msg);
			});

			client.on('end', function() {
				node.log("ended");
			});

			client.on('close', function() {
				client.destroy();
				node.log('closed');
				to = setTimeout(setupTcpClient, reConnect);
			});

			client.on('error', function(err) {
				node.log('error : '+err);
				//to = setTimeout(setupTcpClient, reConnect);
			});
		}
		setupTcpClient();

		this._close = function() {
			client.end();
			clearTimeout(to);
			node.log('input stopped');
		}
	}
	else {
		var server = net.createServer(function (socket) {
			var buffer = null;
			socket.on('data', function (chunk) {
			//if (buffer == null) {
			//	buffer = chunk;
			//} else {
				//buffer = Buffer.concat([buffer,chunk]);
				var msg = {topic:node.topic, payload:chunk, fromip:socket.remoteAddress+':'+socket.remotePort};
				node.send(msg);
			//}
			});
			socket.on('end', function() {
				var msg = {topic:node.topic, payload:buffer, fromip:socket.remoteAddress+':'+socket.remotePort};
				node.send(msg);
			});
		});
		server.listen(node.port);
		node.log('socket input on port '+node.port);

		this._close = function() {
			server.close();
			node.log('socket input stopped');
		}
	}

}

RED.nodes.registerType("tcp in",TcpIn);

TcpIn.prototype.close = function() {
	this._close();
}

