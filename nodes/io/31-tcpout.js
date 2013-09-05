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

function TcpOut(n) {
	RED.nodes.createNode(this,n);
	this.host = n.host;
	this.port = n.port * 1;
	this.base64 = n.base64;
	this.beserver = n.beserver;
	this.name = n.name;
	var node = this;

	if (!node.beserver) {
		var client = new net.Socket();
		var to;

		function setupTcpClient() {
			client.connect(node.port, node.host, function() {
				node.log("output connected to "+node.host+":"+node.port);
			});

			client.on('error', function (err) {
				node.error('error : '+err);
				to = setTimeout(setupTcpClient, reConnect);
			});

			client.on('end', function (err) {
				node.log("output disconnected");
				to = setTimeout(setupTcpClient, reConnect);
			});

			client.on('close', function() {
				client.destroy();
				node.log('closed');
				to = setTimeout(setupTcpClient, reConnect);
			});

			node.on("input", function(msg) {
				if (msg.payload != null) {
					if (node.base64) { client.write(new Buffer(msg.payload,'base64')); }
					else { client.write(msg.payload);}
				}
			});
		}
		setupTcpClient();

		this._close = function() {
			client.end();
			clearTimeout(to);
			node.log('output stopped');
		}
	}

	else {
		var server = net.createServer(function (socket) {
			socket.on("connect",function() {
				node.log("Connection from "+socket.remoteAddress);
			});
			node.on("input", function(msg) {
				if (msg.payload != null) {
					if (node.base64) { socket.write(new Buffer(msg.payload,'base64')); }
					else { socket.write(msg.payload);}
				}
			});
		});
		server.listen(node.port);
		node.log('socket output on port '+node.port);

		this._close = function() {
			server.close();
			node.log('output stopped');
		}
	}
}

RED.nodes.registerType("tcp out",TcpOut);

TcpOut.prototype.close = function() {
	this._close();
}

