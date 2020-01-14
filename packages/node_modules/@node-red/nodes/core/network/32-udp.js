/**
 * Copyright JS Foundation and other contributors, http://js.foundation
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
    var os = require('os');
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

        if (node.iface && node.iface.indexOf(".") === -1) {
            try {
                if ((os.networkInterfaces())[node.iface][0].hasOwnProperty("scopeid")) {
                    if (node.ipv === "udp4") {
                        node.iface = (os.networkInterfaces())[node.iface][1].address;
                    } else {
                        node.iface = (os.networkInterfaces())[node.iface][0].address;
                    }
                }
                else {
                    if (node.ipv === "udp4") {
                        node.iface = (os.networkInterfaces())[node.iface][0].address;
                    } else {
                        node.iface = (os.networkInterfaces())[node.iface][1].address;
                    }
                }
            }
            catch(e) {
                node.warn(RED._("udp.errors.ifnotfound",{iface:node.iface}));
                node.iface = null;
            }
        }

        var opts = {type:node.ipv, reuseAddr:true};
        if (process.version.indexOf("v0.10") === 0) { opts = node.ipv; }
        var server;

        if (!udpInputPortsInUse.hasOwnProperty(node.port)) {
            server = dgram.createSocket(opts);  // default to udp4
            server.bind(node.port, function() {
                if (node.multicast == "true") {
                    server.setBroadcast(true);
                    server.setMulticastLoopback(false);
                    try {
                        server.setMulticastTTL(128);
                        server.addMembership(node.group,node.iface);
                        if (node.iface) { node.status({text:n.iface+" : "+node.iface}); }
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
            udpInputPortsInUse[node.port] = server;
        }
        else {
            node.log(RED._("udp.errors.alreadyused",{port:node.port}));
            server = udpInputPortsInUse[node.port];  // re-use existing
            if (node.iface) { node.status({text:n.iface+" : "+node.iface}); }
        }

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
            node.log(RED._("udp.status.listener-at",{host:node.iface||address.address,port:address.port}));

        });

        node.on("close", function() {
            try {
                if (node.multicast == "true") { server.dropMembership(node.group); }
                server.close();
                node.log(RED._("udp.status.listener-stopped"));
            } catch (err) {
                //node.error(err);
            }
            if (udpInputPortsInUse.hasOwnProperty(node.port)) {
                delete udpInputPortsInUse[node.port];
            }
            node.status({});
        });

    }
    RED.httpAdmin.get('/udp-ports/:id', RED.auth.needsPermission('udp-ports.read'), function(req,res) {
        res.json(Object.keys(udpInputPortsInUse));
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

        if (node.iface && node.iface.indexOf(".") === -1) {
            try {
                if ((os.networkInterfaces())[node.iface][0].hasOwnProperty("scopeid")) {
                    if (node.ipv === "udp4") {
                        node.iface = (os.networkInterfaces())[node.iface][1].address;
                    } else {
                        node.iface = (os.networkInterfaces())[node.iface][0].address;
                    }
                }
                else {
                    if (node.ipv === "udp4") {
                        node.iface = (os.networkInterfaces())[node.iface][0].address;
                    } else {
                        node.iface = (os.networkInterfaces())[node.iface][1].address;
                    }
                }
            }
            catch(e) {
                node.warn(RED._("udp.errors.ifnotfound",{iface:node.iface}));
                node.iface = null;
            }
        }

        var opts = {type:node.ipv, reuseAddr:true};

        var sock;
        var p = this.outport || this.port || "0";
        node.tout = setTimeout(function() {
            if (udpInputPortsInUse[p]) {
                sock = udpInputPortsInUse[p];
                node.log(RED._("udp.status.re-use",{outport:node.outport,host:node.addr,port:node.port}));
                if (node.iface) { node.status({text:n.iface+" : "+node.iface}); }
            }
            else {
                sock = dgram.createSocket(opts);  // default to udp4
                if (node.multicast != "false") {
                    sock.bind(node.outport, function() {    // have to bind before you can enable broadcast...
                        sock.setBroadcast(true);            // turn on broadcast
                        sock.setMulticastLoopback(false);   // turn off loopback
                        if (node.multicast == "multi") {
                            try {
                                sock.setMulticastTTL(128);
                                sock.addMembership(node.addr,node.iface);   // Add to the multicast group
                                if (node.iface) { node.status({text:n.iface+" : "+node.iface}); }
                                node.log(RED._("udp.status.mc-ready",{iface:node.iface,outport:node.outport,host:node.addr,port:node.port}));
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
                } else if ((node.outport !== "") && (!udpInputPortsInUse[node.outport])) {
                    sock.bind(node.outport);
                    node.log(RED._("udp.status.ready",{outport:node.outport,host:node.addr,port:node.port}));
                } else {
                    node.log(RED._("udp.status.ready-nolocal",{host:node.addr,port:node.port}));
                }
                sock.on("error", function(err) {
                    // Any async error will also get reported in the sock.send call.
                    // This handler is needed to ensure the error marked as handled to
                    // prevent it going to the global error handler and shutting node-red
                    // down.
                });
                udpInputPortsInUse[p] = sock;
            }

            node.on("input", function(msg, nodeSend, nodeDone) {
                if (msg.hasOwnProperty("payload")) {
                    var add = node.addr || msg.ip || "";
                    var por = node.port || msg.port || 0;
                    if (add === "") {
                        node.warn(RED._("udp.errors.ip-notset"));
                        nodeDone();
                    } else if (por === 0) {
                        node.warn(RED._("udp.errors.port-notset"));
                        nodeDone();
                    } else if (isNaN(por) || (por < 1) || (por > 65535)) {
                        node.warn(RED._("udp.errors.port-invalid"));
                        nodeDone();
                    } else {
                        var message;
                        if (node.base64) {
                            message = Buffer.from(msg.payload, 'base64');
                        } else if (msg.payload instanceof Buffer) {
                            message = msg.payload;
                        } else {
                            message = Buffer.from(""+msg.payload);
                        }
                        sock.send(message, 0, message.length, por, add, function(err, bytes) {
                            if (err) {
                                node.error("udp : "+err,msg);
                            }
                            message = null;
                            nodeDone();
                        });
                    }
                }
            });
        }, 75);

        node.on("close", function() {
            if (node.tout) { clearTimeout(node.tout); }
            try {
                if (node.multicast == "multi") { sock.dropMembership(node.group); }
                sock.close();
                node.log(RED._("udp.status.output-stopped"));
            } catch (err) {
                //node.error(err);
            }
            if (udpInputPortsInUse.hasOwnProperty(p)) {
                delete udpInputPortsInUse[p];
            }
            node.status({});
        });
    }
    RED.nodes.registerType("udp out",UDPout);
}
