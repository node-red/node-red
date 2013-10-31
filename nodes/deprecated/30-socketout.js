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

function SocketOut(n) {
    RED.nodes.createNode(this,n);
    this.warn("node type deprecated - will be removed in a future release");
    this.host = n.host;
    this.port = n.port * 1;
    this.name = n.name;
    this.trans = n.transport||n.trans||"";
    var node = this;
    this.on("input", function(msg) {
        if (msg != null) {
            if (this.trans == "http") {
                var http = require("http");
                http.get(msg.payload, function(res) {
                    node.log("http : response : " + res.statusCode);
                }).on('error', function(e) {
                    node.error("http : error : " + e.message);
                });
            }
            if (this.trans == "tcp") {
                var net = require('net');
                var client = new net.Socket();
                client.on('error', function (err) {
                    node.error('tcp : '+err);
                });
                client.connect(this.port, this.host, function() {
                    try { client.end(msg.payload); }
                    catch (e) { node.error(e); }
                });
            }
            if (this.trans == "udp") {
                var dgram = require('dgram');
                var sock = dgram.createSocket('udp4');  // only use ipv4 for now
                sock.bind(this.port);  // have to bind before you can enable broadcast...
                sock.setBroadcast(true);  // turn on broadcast
                var buf = new Buffer(msg.payload);
                sock.send(buf, 0, buf.length, this.port, this.host, function(err, bytes) {
                    if (err) node.error("udp : "+err);
                    //util.log('[socket out] udp :' +bytes);
                    sock.close();
                });
            }
        }
    });
    var node = this;
}

RED.nodes.registerType("socket out",SocketOut);
