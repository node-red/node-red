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
    var reconnectTime = RED.settings.socketReconnectTime||10000;
    var socketTimeout = RED.settings.socketTimeout||null;
    var net = require('net');

    var connectionPool = {};

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
        this.connected = false;
        var node = this;
        var count = 0;

        if (!node.server) {
            var buffer = null;
            var client;
            var reconnectTimeout;
            var end = false;
            var setupTcpClient = function() {
                node.log(RED._("tcpin.status.connecting",{host:node.host,port:node.port}));
                node.status({fill:"grey",shape:"dot",text:"common.status.connecting"});
                var id = (1+Math.random()*4294967295).toString(16);
                client = net.connect(node.port, node.host, function() {
                    buffer = (node.datatype == 'buffer')? new Buffer(0):"";
                    node.connected = true;
                    node.log(RED._("tcpin.status.connected",{host:node.host,port:node.port}));
                    node.status({fill:"green",shape:"dot",text:"common.status.connected"});
                });
                connectionPool[id] = client;

                client.on('data', function (data) {
                    if (node.datatype != 'buffer') {
                        data = data.toString(node.datatype);
                    }
                    if (node.stream) {
                        var msg;
                        if ((node.datatype) === "utf8" && node.newline !== "") {
                            buffer = buffer+data;
                            var parts = buffer.split(node.newline);
                            for (var i = 0; i<parts.length-1; i+=1) {
                                msg = {topic:node.topic, payload:parts[i]};
                                msg._session = {type:"tcp",id:id};
                                node.send(msg);
                            }
                            buffer = parts[parts.length-1];
                        } else {
                            msg = {topic:node.topic, payload:data};
                            msg._session = {type:"tcp",id:id};
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
                    if (!node.stream || (node.datatype == "utf8" && node.newline !== "" && buffer.length > 0)) {
                        var msg = {topic:node.topic, payload:buffer};
                        msg._session = {type:"tcp",id:id};
                        if (buffer.length !== 0) {
                            end = true; // only ask for fast re-connect if we actually got something
                            node.send(msg);
                        }
                        buffer = null;
                    }
                });
                client.on('close', function() {
                    delete connectionPool[id];
                    node.connected = false;
                    node.status({fill:"red",shape:"ring",text:"common.status.disconnected"});
                    if (!node.closing) {
                        if (end) { // if we were asked to close then try to reconnect once very quick.
                            end = false;
                            reconnectTimeout = setTimeout(setupTcpClient, 20);
                        }
                        else {
                            node.log(RED._("tcpin.errors.connection-lost",{host:node.host,port:node.port}));
                            reconnectTimeout = setTimeout(setupTcpClient, reconnectTime);
                        }
                    } else {
                        if (node.done) { node.done(); }
                    }
                });
                client.on('error', function(err) {
                    node.log(err);
                });
            }
            setupTcpClient();

            this.on('close', function(done) {
                node.done = done;
                this.closing = true;
                if (client) { client.destroy(); }
                clearTimeout(reconnectTimeout);
                if (!node.connected) { done(); }
            });
        } else {
            var server = net.createServer(function (socket) {
                socket.setKeepAlive(true,120000);
                if (socketTimeout !== null) { socket.setTimeout(socketTimeout); }
                var id = (1+Math.random()*4294967295).toString(16);
                connectionPool[id] = socket;
                count++;
                node.status({text:RED._("tcpin.status.connections",{count:count})});

                var buffer = (node.datatype == 'buffer')? new Buffer(0):"";
                socket.on('data', function (data) {
                    if (node.datatype != 'buffer') {
                        data = data.toString(node.datatype);
                    }
                    if (node.stream) {
                        var msg;
                        if ((typeof data) === "string" && node.newline !== "") {
                            buffer = buffer+data;
                            var parts = buffer.split(node.newline);
                            for (var i = 0; i<parts.length-1; i+=1) {
                                msg = {topic:node.topic, payload:parts[i], ip:socket.remoteAddress, port:socket.remotePort};
                                msg._session = {type:"tcp",id:id};
                                node.send(msg);
                            }
                            buffer = parts[parts.length-1];
                        } else {
                            msg = {topic:node.topic, payload:data, ip:socket.remoteAddress, port:socket.remotePort};
                            msg._session = {type:"tcp",id:id};
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
                    if (!node.stream || (node.datatype === "utf8" && node.newline !== "")) {
                        if (buffer.length > 0) {
                            var msg = {topic:node.topic, payload:buffer, ip:socket.remoteAddress, port:socket.remotePort};
                            msg._session = {type:"tcp",id:id};
                            node.send(msg);
                        }
                        buffer = null;
                    }
                });
                socket.on('timeout', function() {
                    node.log(RED._("tcpin.errors.timeout",{port:node.port}));
                    socket.end();
                });
                socket.on('close', function() {
                    delete connectionPool[id];
                    count--;
                    node.status({text:RED._("tcpin.status.connections",{count:count})});
                });
                socket.on('error',function(err) {
                    node.log(err);
                });
            });
            server.on('error', function(err) {
                if (err) {
                    node.error(RED._("tcpin.errors.cannot-listen",{port:node.port,error:err.toString()}));
                }
            });

            server.listen(node.port, function(err) {
                if (err) {
                    node.error(RED._("tcpin.errors.cannot-listen",{port:node.port,error:err.toString()}));
                } else {
                    node.log(RED._("tcpin.status.listening-port",{port:node.port}));
                    node.on('close', function() {
                        for (var c in connectionPool) {
                            if (connectionPool.hasOwnProperty(c)) {
                                connectionPool[c].end();
                                connectionPool[c].unref();
                            }
                        }
                        node.closing = true;
                        server.close();
                        node.log(RED._("tcpin.status.stopped-listening",{port:node.port}));
                    });
                }
            });
        }
    }
    RED.nodes.registerType("tcp in",TcpIn);

    function TcpOut(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port * 1;
        this.base64 = n.base64;
        this.doend = n.end || false;
        this.beserver = n.beserver;
        this.name = n.name;
        this.closing = false;
        this.connected = false;
        var node = this;

        if (!node.beserver||node.beserver=="client") {
            var reconnectTimeout;
            var client = null;
            var end = false;

            var setupTcpClient = function() {
                node.log(RED._("tcpin.status.connecting",{host:node.host,port:node.port}));
                node.status({fill:"grey",shape:"dot",text:"common.status.connecting"});
                client = net.connect(node.port, node.host, function() {
                    node.connected = true;
                    node.log(RED._("tcpin.status.connected",{host:node.host,port:node.port}));
                    node.status({fill:"green",shape:"dot",text:"common.status.connected"});
                });
                client.on('error', function (err) {
                    node.log(RED._("tcpin.errors.error",{error:err.toString()}));
                });
                client.on('end', function (err) {
                    node.status({});
                    node.connected = false;
                });
                client.on('close', function() {
                    node.status({fill:"red",shape:"ring",text:"common.status.disconnected"});
                    node.connected = false;
                    client.destroy();
                    if (!node.closing) {
                        if (end) {
                            end = false;
                            reconnectTimeout = setTimeout(setupTcpClient,20);
                        }
                        else {
                            node.log(RED._("tcpin.errors.connection-lost",{host:node.host,port:node.port}));
                            reconnectTimeout = setTimeout(setupTcpClient,reconnectTime);
                        }
                    } else {
                        if (node.done) { node.done(); }
                    }
                });
            }
            setupTcpClient();

            node.on("input", function(msg) {
                if (node.connected && msg.payload != null) {
                    if (Buffer.isBuffer(msg.payload)) {
                        client.write(msg.payload);
                    } else if (typeof msg.payload === "string" && node.base64) {
                        client.write(new Buffer(msg.payload,'base64'));
                    } else {
                        client.write(new Buffer(""+msg.payload));
                    }
                    if (node.doend === true) {
                        end = true;
                        if (client) { node.status({}); client.destroy(); }
                    }
                }
            });

            node.on("close", function(done) {
                node.done = done;
                this.closing = true;
                if (client) { client.destroy(); }
                clearTimeout(reconnectTimeout);
                if (!node.connected) { done(); }
            });

        } else if (node.beserver == "reply") {
            node.on("input",function(msg) {
                if (msg._session && msg._session.type == "tcp") {
                    var client = connectionPool[msg._session.id];
                    if (client) {
                        if (Buffer.isBuffer(msg.payload)) {
                            client.write(msg.payload);
                        } else if (typeof msg.payload === "string" && node.base64) {
                            client.write(new Buffer(msg.payload,'base64'));
                        } else {
                            client.write(new Buffer(""+msg.payload));
                        }
                    }
                }
                else {
                    for (var i in connectionPool) {
                        if (Buffer.isBuffer(msg.payload)) {
                            connectionPool[i].write(msg.payload);
                        } else if (typeof msg.payload === "string" && node.base64) {
                            connectionPool[i].write(new Buffer(msg.payload,'base64'));
                        } else {
                            connectionPool[i].write(new Buffer(""+msg.payload));
                        }
                    }
                }
            });
        } else {
            var connectedSockets = [];
            node.status({text:RED._("tcpin.status.connections",{count:0})});
            var server = net.createServer(function (socket) {
                socket.setKeepAlive(true,120000);
                if (socketTimeout !== null) { socket.setTimeout(socketTimeout); }
                var remoteDetails = socket.remoteAddress+":"+socket.remotePort;
                node.log(RED._("tcpin.status.connection-from",{host:socket.remoteAddress, port:socket.remotePort}));
                connectedSockets.push(socket);
                node.status({text:RED._("tcpin.status.connections",{count:connectedSockets.length})});
                socket.on('timeout', function() {
                    node.log(RED._("tcpin.errors.timeout",{port:node.port}));
                    socket.end();
                });
                socket.on('close',function() {
                    node.log(RED._("tcpin.status.connection-closed",{host:socket.remoteAddress, port:socket.remotePort}));
                    connectedSockets.splice(connectedSockets.indexOf(socket),1);
                    node.status({text:RED._("tcpin.status.connections",{count:connectedSockets.length})});
                });
                socket.on('error',function() {
                    node.log(RED._("tcpin.errors.socket-error",{host:socket.remoteAddress, port:socket.remotePort}));
                    connectedSockets.splice(connectedSockets.indexOf(socket),1);
                    node.status({text:RED._("tcpin.status.connections",{count:connectedSockets.length})});
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
                    for (var i = 0; i < connectedSockets.length; i += 1) {
                        if (node.doend === true) { connectedSockets[i].end(buffer); }
                        else { connectedSockets[i].write(buffer); }
                    }
                }
            });

            server.on('error', function(err) {
                if (err) {
                    node.error(RED._("tcpin.errors.cannot-listen",{port:node.port,error:err.toString()}));
                }
            });

            server.listen(node.port, function(err) {
                if (err) {
                    node.error(RED._("tcpin.errors.cannot-listen",{port:node.port,error:err.toString()}));
                } else {
                    node.log(RED._("tcpin.status.listening-port",{port:node.port}));
                    node.on('close', function() {
                        for (var c in connectedSockets) {
                            if (connectedSockets.hasOwnProperty(c)) {
                                connectedSockets[c].end();
                                connectedSockets[c].unref();
                            }
                        }
                        server.close();
                        node.log(RED._("tcpin.status.stopped-listening",{port:node.port}));
                    });
                }
            });
        }
    }
    RED.nodes.registerType("tcp out",TcpOut);

    function TcpGet(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.port = Number(n.port);
        this.out = n.out;
        this.splitc = n.splitc;

        if (this.out != "char") { this.splitc = Number(this.splitc); }
        else {
            if (this.splitc[0] == '\\') {
                this.splitc = parseInt(this.splitc.replace("\\n",0x0A).replace("\\r",0x0D).replace("\\t",0x09).replace("\\e",0x1B).replace("\\f",0x0C).replace("\\0",0x00));
            } // jshint ignore:line
            if (typeof this.splitc == "string") {
                if (this.splitc.substr(0,2) == "0x") {
                    this.splitc = parseInt(this.splitc);
                }
                else {
                    this.splitc = this.splitc.charCodeAt(0);
                }
            } // jshint ignore:line
        }

        var node = this;

        var clients = {};

        this.on("input", function(msg) {
            var i = 0;
            if ((!Buffer.isBuffer(msg.payload)) && (typeof msg.payload !== "string")) {
                msg.payload = msg.payload.toString();
            }

            var host = node.server || msg.host;
            var port = node.port || msg.port;

            // Store client information independently
            // the clients object will have:
            // clients[id].client, clients[id].msg, clients[id].timeout
            var connection_id = host + ":" + port;
            clients[connection_id] = clients[connection_id] || {};
            clients[connection_id].msg = msg;
            clients[connection_id].connected = clients[connection_id].connected || false;

            if (!clients[connection_id].connected) {
                var buf;
                if (this.out == "count") {
                    if (this.splitc === 0) { buf = new Buffer(1); }
                    else { buf = new Buffer(this.splitc); }
                }
                else { buf = new Buffer(65536); } // set it to 64k... hopefully big enough for most TCP packets.... but only hopefully

                clients[connection_id].client = net.Socket();
                if (socketTimeout !== null) { clients[connection_id].client.setTimeout(socketTimeout);}

                if (host && port) {
                    clients[connection_id].client.connect(port, host, function() {
                        //node.log(RED._("tcpin.errors.client-connected"));
                        node.status({fill:"green",shape:"dot",text:"common.status.connected"});
                        if (clients[connection_id] && clients[connection_id].client) {
                            clients[connection_id].connected = true;
                            clients[connection_id].client.write(clients[connection_id].msg.payload);
                        }
                    });
                }
                else {
                    node.warn(RED._("tcpin.errors.no-host"));
                }

                clients[connection_id].client.on('data', function(data) {
                    if (node.out === "sit") { // if we are staying connected just send the buffer
                        if (clients[connection_id]) {
                            if (!clients[connection_id].hasOwnProperty("msg")) { clients[connection_id].msg = {}; }
                            clients[connection_id].msg.payload = data;
                            node.send(RED.util.cloneMessage(clients[connection_id].msg));
                        }
                    }
                    else if (node.splitc === 0) {
                        clients[connection_id].msg.payload = data;
                        node.send(clients[connection_id].msg);
                    }
                    else {
                        for (var j = 0; j < data.length; j++ ) {
                            if (node.out === "time") {
                                if (clients[connection_id]) {
                                    // do the timer thing
                                    if (clients[connection_id].timeout) {
                                        i += 1;
                                        buf[i] = data[j];
                                    }
                                    else {
                                        clients[connection_id].timeout = setTimeout(function () {
                                            if (clients[connection_id]) {
                                                clients[connection_id].timeout = null;
                                                clients[connection_id].msg.payload = new Buffer(i+1);
                                                buf.copy(clients[connection_id].msg.payload,0,0,i+1);
                                                node.send(clients[connection_id].msg);
                                                if (clients[connection_id].client) {
                                                    node.status({});
                                                    clients[connection_id].client.destroy();
                                                    delete clients[connection_id];
                                                }
                                            }
                                        }, node.splitc);
                                        i = 0;
                                        buf[0] = data[j];
                                    }
                                }
                            }
                            // count bytes into a buffer...
                            else if (node.out == "count") {
                                buf[i] = data[j];
                                i += 1;
                                if ( i >= node.splitc) {
                                    if (clients[connection_id]) {
                                        clients[connection_id].msg.payload = new Buffer(i);
                                        buf.copy(clients[connection_id].msg.payload,0,0,i);
                                        node.send(clients[connection_id].msg);
                                        if (clients[connection_id].client) {
                                            node.status({});
                                            clients[connection_id].client.destroy();
                                            delete clients[connection_id];
                                        }
                                        i = 0;
                                    }
                                }
                            }
                            // look for a char
                            else {
                                buf[i] = data[j];
                                i += 1;
                                if (data[j] == node.splitc) {
                                    if (clients[connection_id]) {
                                        clients[connection_id].msg.payload = new Buffer(i);
                                        buf.copy(clients[connection_id].msg.payload,0,0,i);
                                        node.send(clients[connection_id].msg);
                                        if (clients[connection_id].client) {
                                            node.status({});
                                            clients[connection_id].client.destroy();
                                            delete clients[connection_id];
                                        }
                                        i = 0;
                                    }
                                }
                            }
                        }
                    }
                });

                clients[connection_id].client.on('end', function() {
                    //console.log("END");
                    node.status({fill:"grey",shape:"ring",text:"common.status.disconnected"});
                    if (clients[connection_id] && clients[connection_id].client) {
                        clients[connection_id].connected = false;
                        clients[connection_id].client = null;
                    }
                });

                clients[connection_id].client.on('close', function() {
                    //console.log("CLOSE");
                    if (clients[connection_id]) {
                        clients[connection_id].connected = false;
                    }

                    var anyConnected = false;

                    for (var client in clients) {
                        if (clients[client].connected) {
                            anyConnected = true;
                            break;
                        }
                    }
                    if (node.done && !anyConnected) {
                        clients = {};
                        node.done();
                    }
                });

                clients[connection_id].client.on('error', function() {
                    //console.log("ERROR");
                    node.status({fill:"red",shape:"ring",text:"common.status.error"});
                    node.error(RED._("tcpin.errors.connect-fail") + " " + connection_id, msg);
                    if (clients[connection_id] && clients[connection_id].client) {
                        clients[connection_id].connected = false;
                        clients[connection_id].client.destroy();
                        delete clients[connection_id];
                    }
                });

                clients[connection_id].client.on('timeout',function() {
                    //console.log("TIMEOUT");
                    if (clients[connection_id]) {
                        clients[connection_id].connected = false;
                        node.status({fill:"grey",shape:"dot",text:"tcpin.errors.connect-timeout"});
                        //node.warn(RED._("tcpin.errors.connect-timeout"));
                        if (clients[connection_id].client) {
                            clients[connection_id].client.connect(port, host, function() {
                                clients[connection_id].connected = true;
                                node.status({fill:"green",shape:"dot",text:"common.status.connected"});
                            });
                        }
                    }
                });
            }
            else {
                if (clients[connection_id] && clients[connection_id].client) {
                    clients[connection_id].client.write(clients[connection_id].msg.payload);
                }
            }
        });

        this.on("close", function(done) {
            node.done = done;
            for (var client in clients) {
                if (clients.hasOwnProperty("client")) {
                    clients[client].client.destroy();
                }
            }
            node.status({});

            var anyConnected = false;
            for (var c in clients) {
                if (clients[c].connected) {
                    anyConnected = true;
                    break;
                }
            }

            if (!anyConnected) {
                clients = {};
                done();
            }
        });

    }
    RED.nodes.registerType("tcp request",TcpGet);
}
