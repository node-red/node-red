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
var dgram = require('dgram');

// The Input Node
function MCastIn(n) {
    RED.nodes.createNode(this,n);
    this.warn("node type deprecated - will be removed in a future release");
    this.group = n.group;
    this.port = n.port;
    this.host = n.host || null;
    this.base64 = n.base64;
    this.iface = n.iface || null;
    this.multicast = n.multicast;
    var node = this;

    var server = dgram.createSocket('udp4');

    server.on("error", function (err) {
        console.log("udp listener error:\n" + err.stack);
        server.close();
    });

    server.on('message', function (message, remote) {
        var msg;
        if (node.base64) { msg = { payload:message.toString('base64'), fromip:remote.address+':'+remote.port }; }
        else { msg = { payload:message, fromip:remote.address+':'+remote.port }; }
        node.send(msg);
    });

    server.on('listening', function () {
        var address = server.address();
        node.log('udp listener at ' + address.address + ":" + address.port);
        if (node.multicast) {
            server.setBroadcast(true)
            server.setMulticastTTL(128);
            server.addMembership(node.group,node.iface);
            node.log("udp multicast group "+node.group);
        }
    });

    //server.bind(node.port,node.host);
    server.bind(node.port,node.host);

    this._close = function() {
        server.close();
        node.log('udp listener stopped');
    }

}

MCastIn.prototype.close = function() {
    this._close();
}
RED.nodes.registerType("multicast in",MCastIn);

// The Output Node
function MCastOut(n) {
    RED.nodes.createNode(this,n);
    this.warn("node type deprecated");
    this.group = n.group;
    this.port = n.port;
    this.host = n.host || null;
    this.base64 = n.base64;
    this.iface = n.iface || null;
    this.multicast = n.multicast;
    var node = this;

    var sock = dgram.createSocket('udp4');  // only use ipv4 for now
    sock.bind(node.port);           // have to bind before you can enable broadcast...
    sock.setBroadcast(true);        // turn on broadcast
    sock.setMulticastTTL(128);
    sock.addMembership(node.group,node.iface);  // Add to the multicast group
    node.log('udp multicaster ready on '+node.group+":"+node.port);

    node.on("input", function(msg) {
        if (msg.payload != null) {
            console.log("MCast:",msg.payload);
            var message;
            if (node.base64) {
                message = new Buffer(msg.payload,'base64');
            }
            else {
                message = new Buffer(msg.payload);
            }
            sock.send(message, 0, message.length, node.port, node.group, function(err, bytes) {
                if (err) node.error("udp : "+err);
                //util.log('[socket out] udp :' +bytes);
            });
        }
    });

    this._close = function() {
        sock.close();
        node.log('udp multicaster stopped');
    }

}

RED.nodes.registerType("multicast out",MCastOut);

MCastOut.prototype.close = function() {
    this._close();
}
