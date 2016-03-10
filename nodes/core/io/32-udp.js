/**
 * Copyright 2013,2016 IBM Corp.
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

module.exports = function(RED) {
    "use strict";
    var dgram = require('dgram');
    var udpInputPortsInUse = {};

    // The Input Node
    function UDPin(n) {
        RED.nodes.createNode(this,n);
        this.group = n.group;
        this.port = n.port;
        this.datatype = n.datatype;
        this.iface = n.iface || null;
        this.multicast = n.multicast;
        this.ipv = n.ipv || "udp4";
        var node = this;
        if (!udpInputPortsInUse.hasOwnProperty(this.port)) {
            udpInputPortsInUse[this.port] = n.id;
        }
        else {
            node.warn(RED._("udp.errors.alreadyused",node.port));
        }

        var opts = {type:node.ipv, reuseAddr:true};
        if (process.version.indexOf("v0.10") === 0) { opts = node.ipv; }
        var server = dgram.createSocket(opts);  // default to udp4

        server.on("error", function (err) {
            if ((err.code == "EACCES") && (node.port < 1024)) {
                node.error(RED._("udp.errors.access-error"));
            } else {
                node.error(RED._("udp.errors.error",{error:err.code}));
            }
            server.close();
        });

        server.on('message', function (message, remote) {
            var msg;
            if (node.datatype =="base64") {
                msg = { payload:message.toString('base64'), fromip:remote.address+':'+remote.port, ip:remote.address, port:remote.port };
            } else if (node.datatype =="utf8") {
                msg = { payload:message.toString('utf8'), fromip:remote.address+':'+remote.port, ip:remote.address, port:remote.port };
            } else {
                msg = { payload:message, fromip:remote.address+':'+remote.port, ip:remote.address, port:remote.port };
            }
            node.send(msg);
        });

        server.on('listening', function () {
            var address = server.address();
            node.log(RED._("udp.status.listener-at",{host:address.address,port:address.port}));
            if (node.multicast == "true") {
                server.setBroadcast(true);
                try {
                    server.setMulticastTTL(128);
                    server.addMembership(node.group,node.iface);
                    node.log(RED._("udp.status.mc-group",{group:node.group}));
                } catch (e) {
                    if (e.errno == "EINVAL") {
                        node.error(RED._("udp.errors.bad-mcaddress"));
                    } else if (e.errno == "ENODEV") {
                        node.error(RED._("udp.errors.interface"));
                    } else {
                        node.error(RED._("udp.errors.error",{error:e.errno}));
                    }
                }
            }
        });

        node.on("close", function() {
            console.log("ID=",node.id);
            if (udpInputPortsInUse[node.port] === node.id) {
                delete udpInputPortsInUse[node.port];
            }
            try {
                server.close();
                node.log(RED._("udp.status.listener-stopped"));
            } catch (err) {
                node.error(err);
            }
        });

        server.bind(node.port,node.iface);
    }
    RED.httpAdmin.get('/udp-ports/:id', RED.auth.needsPermission('udp-in.read'), function(req,res) {
        res.json(udpInputPortsInUse);
    });
    RED.nodes.registerType("udp in",UDPin);

    // The Output Node
    function UDPout(n) {
        RED.nodes.createNode(this,n);
        //this.group = n.group;
        this.port = n.port;
        this.outport = n.outport||"";
        this.base64 = n.base64;
        this.addr = n.addr;
        this.iface = n.iface || null;
        this.multicast = n.multicast;
        this.ipv = n.ipv || "udp4";
        var node = this;

        var opts = {type:node.ipv, reuseAddr:true};
        if (process.version.indexOf("v0.10") === 0) { opts = node.ipv; }
        var sock = dgram.createSocket(opts);  // default to udp4

        sock.on("error", function(err) {
            // Any async error will also get reported in the sock.send call.
            // This handler is needed to ensure the error marked as handled to
            // prevent it going to the global error handler and shutting node-red
            // down.
        });
        if (node.multicast != "false") {
            if (node.outport == "") { node.outport = node.port; }
            sock.bind(node.outport, function() {    // have to bind before you can enable broadcast...
                sock.setBroadcast(true);            // turn on broadcast
                if (node.multicast == "multi") {
                    try {
                        sock.setMulticastTTL(128);
                        sock.addMembership(node.addr,node.iface);   // Add to the multicast group
                        node.log(RED._("udp.status.mc-ready",{outport:node.outport,host:node.addr,port:node.port}));
                    } catch (e) {
                        if (e.errno == "EINVAL") {
                            node.error(RED._("udp.errors.bad-mcaddress"));
                        } else if (e.errno == "ENODEV") {
                            node.error(RED._("udp.errors.interface"));
                        } else {
                            node.error(RED._("udp.errors.error",{error:e.errno}));
                        }
                    }
                } else {
                    node.log(RED._("udp.status.bc-ready",{outport:node.outport,host:node.addr,port:node.port}));
                }
            });
        } else if (node.outport != "") {
            setTimeout( function() {
                sock.bind(node.outport);
                node.log(RED._("udp.status.ready",{outport:node.outport,host:node.addr,port:node.port}));
            }, 250);
        } else {
            node.log(RED._("udp.status.ready-nolocal",{host:node.addr,port:node.port}));
        }

        node.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                var add = node.addr || msg.ip || "";
                var por = node.port || msg.port || 0;
                if (add == "") {
                    node.warn(RED._("udp.errors.ip-notset"));
                } else if (por == 0) {
                    node.warn(RED._("udp.errors.port-notset"));
                } else if (isNaN(por) || (por < 1) || (por > 65535)) {
                    node.warn(RED._("udp.errors.port-invalid"));
                } else {
                    var message;
                    if (node.base64) {
                        message = new Buffer(msg.payload, 'base64');
                    } else if (msg.payload instanceof Buffer) {
                        message = msg.payload;
                    } else {
                        message = new Buffer(""+msg.payload);
                    }
                    sock.send(message, 0, message.length, por, add, function(err, bytes) {
                        if (err) {
                            node.error("udp : "+err,msg);
                        }
                        message = null;
                    });
                }
            }
        });

        node.on("close", function() {
            try {
                sock.close();
                node.log(RED._("udp.status.output-stopped"));
            } catch (err) {
                node.error(err);
            }
        });
    }
    RED.nodes.registerType("udp out",UDPout);
}
