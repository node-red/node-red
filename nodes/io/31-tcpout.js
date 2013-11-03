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

function TcpOut(n) {
    RED.nodes.createNode(this,n);
    this.host = n.host;
    this.port = n.port * 1;
    this.base64 = n.base64;
    this.beserver = n.beserver;
    this.name = n.name;
    this.closing = false;
    var node = this;

    if (!node.beserver||node.beserver=="client") {
        var reconnectTimeout;
        var client = null;
        var connected = false;
        
        function setupTcpClient() {
            node.log("connecting to "+node.host+":"+node.port);
            client = net.connect(node.port, node.host, function() {
                    connected = true;
                    node.log("connected to "+node.host+":"+node.port);
            });
            
            client.on('error', function (err) {
                    node.log('error : '+err);
            });
            
            client.on('end', function (err) {
            });
            
            client.on('close', function() {
                    node.log("connection lost to "+node.host+":"+node.port);
                    connected = false;
                    client.destroy();
                    if (!node.closing) {
                        reconnectTimeout = setTimeout(setupTcpClient,reconnectTime);
                    }
            });
        }
        setupTcpClient();
        
        
        node.on("input", function(msg) {
                if (connected && msg.payload != null) {
                    if (Buffer.isBuffer(msg.payload)) {
                        client.write(msg.payload);
                    } else if (typeof msg.payload === "string" && node.base64) {
                        client.write(new Buffer(msg.payload,'base64'));
                    } else {
                        client.write(new Buffer(""+msg.payload));
                    }
                }
        });
        
        node.on("close", function() {
            this.closing = true;
            client.end();
            clearTimeout(reconnectTimeout);
        });
        
    } else {
        var connectedSockets = [];
        var server = net.createServer(function (socket) {
                var remoteDetails = socket.remoteAddress+":"+socket.remotePort;
                node.log("connection from "+remoteDetails);
                connectedSockets.push(socket);
                socket.on('close',function() {
                        node.log("connection closed from "+remoteDetails);
                        connectedSockets.splice(connectedSockets.indexOf(socket),1);
                });
                socket.on('error',function() {
				        node.log("socket error from "+remoteDetails);
				        connectedSockets.splice(connectedSockets.indexOf(socket),1);
				});

        });
        node.on("input", function(msg) {
                if (msg.payload != null) {
                    var buffer;
                    if (Buffer.isBuffer(msg.payload)) {
                        buffer = msg.payload;
                    } else if (typeof msg.payload === "string" && node.base64) {
                        buffer = new Buffer(msg.payload,'base64');
                    } else {
                        buffer = new Buffer(""+msg.payload);
                    }
                    for (var i = 0; i<connectedSockets.length;i+=1) {
                        connectedSockets[i].write(buffer);
                    }
                }
        });

        server.listen(node.port);
        node.log('listening on port '+node.port);

        node.on('close', function() {
            server.close();
            node.log('stopped listening on port '+node.port);
        });
    }
}

RED.nodes.registerType("tcp out",TcpOut);

