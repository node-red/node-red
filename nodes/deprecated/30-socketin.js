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

function SocketIn(n) {
    RED.nodes.createNode(this,n);
    this.warn("node type deprecated - will be removed in a future release");
    this.port = n.port;
    this.topic = n.topic;
    this.trans = (n.transport||n.trans||"").toLowerCase();
    var node = this;
    if (this.trans == "http") {
        var http = require('http');
        var server = http.createServer(function (req, res) {
            //node.log("http "+req.url);
            var msg = {topic:node.topic,payload:req.url.slice(1)};
            node.send(msg);
            res.writeHead(304, {'Content-Type': 'text/plain'});
            res.end('\n');
        }).listen(node.port);
        server.on('error', function (e) {
            if (e.code == 'EADDRINUSE') {
                setTimeout(node.error('TCP port is already in use - please reconfigure socket.'),250);
            }
            else { console.log(e); }
            server = null;
        });
        node.log('http listener at http://127.0.0.1:'+node.port+'/');

        this._close = function() {
            if (server) server.close();
            node.log('http listener stopped');
        }
    }

    if (this.trans == "tcp") {
        var net = require('net');
        var server = net.createServer(function (socket) {
            var buffer = null;
            socket.on('data', function (chunk) {
                if (buffer == null) {
                    buffer = chunk;
                } else {
                    buffer = Buffer.concat([buffer,chunk]);
                }
            });
            socket.on('end', function() {
                var msg = {topic:node.topic, payload:buffer, fromip:socket.remoteAddress+':'+socket.remotePort};
                node.send(msg);
            });
        });
        server.on('error', function (e) {
            if (e.code == 'EADDRINUSE') {
                setTimeout(node.error('TCP port is already in use - please reconfigure socket.'),250);
            }
            else { console.log(e); }
            server = null;
        });
        server.listen(node.port);
        node.log('tcp listener on port :'+node.port);

        this._close = function() {
            if (server) server.close();
            node.log('tcp listener stopped');
        }
    }

    if (this.trans == "tcpc") {
        var net = require('net');
        var client;
        var to;
        function setupTcpClient() {
            node.log('tcpc connecting to port :'+node.port);
            client = net.connect({port: node.port}, function() {
                node.log("tcpc connected");
            });

            client.on('data', function (data) {
                var msg = {topic:node.topic, payload:data};
                node.send(msg);
            });

            client.on('end', function() {
                node.log("tcpc socket ended");
            });

            client.on('close', function() {
                node.log('tcpc socket closed');
                to = setTimeout(setupTcpClient, 10000); //Try to reconnect
            });

            client.on('error', function() {
                node.log('tcpc socket error');
                client = null;
                to = setTimeout(setupTcpClient, 10000); //Try to reconnect
            });
        }
        setupTcpClient();

        this._close = function() {
            if (client) client.end();
            //client.destroy();
            clearTimeout(to);
            node.log('tcpc stopped client');
        }
        setupTcpClient();
    }

    if (this.trans == "udp") {
        var dgram = require('dgram');
        var server = dgram.createSocket('udp4');
        server.on('listening', function () {
            var address = server.address();
            node.log('udp listener at ' + address.address + ":" + address.port);
        });
        server.on('message', function (message, remote) {
            var msg = {topic:node.topic,payload:message,fromip:remote.address+':'+remote.port};
            node.send(msg);
        });
        server.on('error', function (e) {
            console.log(e);
            server = null;
        });
        server.bind(node.port);

        this._close = function() {
            if (server) server.close();
            node.log('udp listener stopped');
        }
    }

}

RED.nodes.registerType("socket in",SocketIn);

SocketIn.prototype.close = function() {
    this._close();
}
