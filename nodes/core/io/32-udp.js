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
function UDPin(n) {
    RED.nodes.createNode(this,n);
    this.group = n.group;
    this.port = n.port;
    this.datatype = n.datatype;
    this.iface = n.iface || null;
    this.multicast = n.multicast;
    var node = this;

    var server = dgram.createSocket('udp4');

    server.on("error", function (err) {
        //console.log("udp listener error:\n" + err.stack);
        if ((err.code == "EACCES") && (node.port < 1024)) { node.error("UDP access error, you may need root access for ports below 1024"); }
        else { node.error("UDP error : "+err.code); }
        server.close();
    });

    server.on('message', function (message, remote) {
        var msg;
        if (node.datatype =="base64") { msg = { payload:message.toString('base64'), fromip:remote.address+':'+remote.port }; }
        else if (node.datatype =="utf8") { msg = { payload:message.toString('utf8'), fromip:remote.address+':'+remote.port }; }
        else { msg = { payload:message, fromip:remote.address+':'+remote.port, ip:remote.address, port:remote.port }; }
        node.send(msg);
    });

    server.on('listening', function () {
        var address = server.address();
        node.log('udp listener at ' + address.address + ":" + address.port);
        if (node.multicast == "true") {
            server.setBroadcast(true);
            server.setMulticastTTL(128);
            server.addMembership(node.group,node.iface);
            node.log("udp multicast group "+node.group);
        }
    });

    node.on("close", function() {
        try {
            server.close();
            node.log('udp listener stopped');
        }
        catch (err) { console.log(err); }
    });

    server.bind(node.port);
}
RED.nodes.registerType("udp in",UDPin);


// The Output Node
function UDPout(n) {
    RED.nodes.createNode(this,n);
    //this.group = n.group;
    this.port = n.port;
    this.base64 = n.base64;
    this.addr = n.addr;
    this.iface = n.iface || null;
    this.multicast = n.multicast;
    var node = this;

    var sock = dgram.createSocket('udp4');  // only use ipv4 for now

    if (this.multicast != "false") {
        sock.bind(node.port, function() {     // have to bind before you can enable broadcast...
            sock.setBroadcast(true);        // turn on broadcast
            if (this.multicast == "multi") {
                sock.setMulticastTTL(128);
                sock.addMembership(node.addr,node.iface);   // Add to the multicast group
                node.log('udp multicast ready : '+node.addr+":"+node.port);
            }
            else node.log('udp broadcast ready : '+node.addr+":"+node.port);
        });
    }

    else node.log('udp ready : '+node.addr+":"+node.port);

    node.on("input", function(msg) {
        if (msg.payload != null) {
            var add = node.addr || msg.ip || "";
            var por = node.port || msg.port || 0;
            if (add == "") { node.warn("udp: ip address not set"); }
            else if (por == 0) { node.warn("udp: port not set"); }
            else if (isNaN(por) || (por < 1) || (por > 65535))  { node.warn("udp: port number not valid"); }
            else {
                var message;
                if (node.base64) { message = new Buffer(b64string, 'base64'); }
                else if (msg.payload instanceof Buffer) { message = msg.payload; }
                else { message = new Buffer(""+msg.payload); }
                //console.log("UDP send :",add,por,msg.payload.toString());
                sock.send(message, 0, message.length, por, add, function(err, bytes) {
                    if (err) node.error("udp : "+err);
                });
            }
        }
    });

    node.on("close", function() {
        try {
            sock.close();
            node.log('udp output stopped');
        }
        catch (err) { console.log(err); }
    });
}
RED.nodes.registerType("udp out",UDPout);
