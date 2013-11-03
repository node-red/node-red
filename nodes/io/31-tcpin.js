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
var reconnectTime = RED.settings.socketReconnectTime||10000;
var net = require('net');

function TcpIn(n) {
	RED.nodes.createNode(this,n);
	this.host = n.host;
	this.port = n.port * 1;
	this.topic = n.topic;
	this.stream = (!n.datamode||n.datamode=='stream'); /* stream,single*/
	this.datatype = n.datatype||'buffer'; /* buffer,utf8,base64 */
	this.newline = (n.newline||"").replace("\\n","\n").replace("\\r","\r");
	this.base64 = n.base64;
	this.server = (typeof n.server == 'boolean')?n.server:(n.server == "server");
	this.closing = false;
	var node = this;

	if (!node.server) {
        var buffer = null;
		var client;
		var reconnectTimeout;
		function setupTcpClient() {
			node.log("connecting to "+node.host+":"+node.port);
			client = net.connect(node.port, node.host, function() {
			        buffer = (node.datatype == 'buffer')? new Buffer(0):"";
			        node.log("connected to "+node.host+":"+node.port);
			});

			client.on('data', function (data) {
			        if (node.datatype != 'buffer') {
			            data = data.toString(node.datatype);
			        }
			        if (node.stream) {
			            if ((node.datatype) === "utf8" && node.newline != "") {
			                buffer = buffer+data;
			                var parts = buffer.split(node.newline);
			                for (var i = 0;i<parts.length-1;i+=1) {
			                    var msg = {topic:node.topic, payload:parts[i]};
			                    node.send(msg);
			                }
			                buffer = parts[parts.length-1];
			            } else {
			                var msg = {topic:node.topic, payload:data};
			                node.send(msg);
			            }
			        } else {
			            if ((typeof data) === "string") {
			                buffer = buffer+data;
			            } else {
			                buffer = Buffer.concat([buffer,data],buffer.length+data.length);
			            }
			        }
			});
			client.on('end', function() {
			        if (!node.stream || (node.datatype == "utf8" && node.newline != "" && buffer.length > 0)) {
			            var msg = {topic:node.topic,payload:buffer};
			            node.send(msg);
			            buffer = null;
			        }
			});

			client.on('close', function() {
			        node.log("connection lost to "+node.host+":"+node.port);
			        if (!node.closing) {
			            reconnectTimeout = setTimeout(setupTcpClient, reconnectTime);
			        }
			});

			client.on('error', function(err) {
			        node.log(err);
			});
		}
		setupTcpClient();

		this._close = function() {
		    this.closing = true;
			client.end();
			clearTimeout(reconnectTimeout);
		}
	} else {
		var server = net.createServer(function (socket) {
		        var buffer = (node.datatype == 'buffer')? new Buffer(0):"";
		        socket.on('data', function (data) {
		                if (node.datatype != 'buffer') {
		                    data = data.toString(node.datatype);
		                }

		                if (node.stream) {
		                    if ((typeof data) === "string" && node.newline != "") {
		                        buffer = buffer+data;
		                        var parts = buffer.split(node.newline);
		                        for (var i = 0;i<parts.length-1;i+=1) {
		                            var msg = {topic:node.topic, payload:parts[i]};
		                            node.send(msg);
		                        }
		                        buffer = parts[parts.length-1];
		                    } else {
		                        var msg = {topic:node.topic, payload:data};
		                        node.send(msg);
		                    }
		                } else {
		                    if ((typeof data) === "string") {
		                        buffer = buffer+data;
		                    } else {
		                        buffer = Buffer.concat([buffer,data],buffer.length+data.length);
		                    }
		                }
		        });
		        socket.on('end', function() {
		                if (!node.stream || (node.datatype == "utf8" && node.newline != "" && buffer.length > 0)) {
		                    var msg = {topic:node.topic,payload:buffer};
		                    node.send(msg);
		                    buffer = null;
		                }
		        });
		        socket.on('error',function(err) {
		            node.log(err);
		        });
		});
		server.listen(node.port);
		node.log('listening on port '+node.port);

		this._close = function() {
		    this.closing = true;
			server.close();
			node.log('stopped listening on port '+node.port);
		}
	}

}

RED.nodes.registerType("tcp in",TcpIn);

TcpIn.prototype.close = function() {
	this._close();
}
