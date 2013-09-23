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

var events = require("events");
var util = require("util");
var serialp = require("serialport");
var settings = RED.settings;

// TODO: 'serialPool' should be encapsulated in SerialPortNode

function SerialPortNode(n) {
    RED.nodes.createNode(this,n);
    this.serialport = n.serialport;
    this.serialbaud = n.serialbaud * 1;
    this.newline = n.newline;
}
RED.nodes.registerType("serial-port",SerialPortNode);


function SerialOutNode(n) {
    RED.nodes.createNode(this,n);
    this.serial = n.serial;
    this.serialConfig = RED.nodes.getNode(this.serial);

    if (this.serialConfig) {
        var node = this;
        try {
            node.port = serialPool.get(this.serialConfig.serialport,this.serialConfig.serialbaud,this.serialConfig.newline);
        } catch(err) {
            this.error(err);
            return;
        }

        node.port.on("ready",function() {
            node.on("input",function(msg) {
                //console.log("{",msg,"}");
                node.port.write(msg.payload,function(err,res) {
                    if (err) {
                        node.error(err);
                    }
                });
            });
        });
    } else {
        this.error("missing serial config");
    }
}

RED.nodes.registerType("serial out",SerialOutNode);

SerialOutNode.prototype.close = function() {
    if (this.serialConfig) {
        serialPool.close(this.serialConfig.serialport);
    }
}

function SerialInNode(n) {
    RED.nodes.createNode(this,n);
    this.serial = n.serial;
    this.serialConfig = RED.nodes.getNode(this.serial);

    if (this.serialConfig) {
        var node = this;
        try {
            this.port = serialPool.get(this.serialConfig.serialport,this.serialConfig.serialbaud,this.serialConfig.newline);
        } catch(err) {
            this.error(err);
            return;
        }

        this.port.on('data', function(msg) {
                // console.log("{",msg,"}");
                var m = { "payload": msg };
                node.send(m);
        });
    } else {
        this.error("missing serial config");
    }
}

RED.nodes.registerType("serial in",SerialInNode);

SerialInNode.prototype.close = function() {
    if (this.serialConfig) {
        try {
            serialPool.close(this.serialConfig.serialport);
        } catch(err) {
        }
        this.warn("Deploying with serial-port nodes is known to occasionally cause Node-RED to hang. This is due to an open issue with the underlying module.");
    }
}

var serialPool = function() {
    var connections = {};
    return {
        get:function(port,baud,newline,callback) {
            var id = port;
            if (!connections[id]) {
                connections[id] = function() {
                    var obj = {
                        _emitter: new events.EventEmitter(),
                        serial: null,
                        _closing: false,
                        tout: null,
                        on: function(a,b) { this._emitter.on(a,b); },
                        close: function(cb) { this.serial.close(cb)},
                        write: function(m,cb) { this.serial.write(m,cb)},
                    }
                    newline = newline.replace("\\n","\n").replace("\\r","\r");
                    var setupSerial = function() {
						if (newline == "") {
							obj.serial = new serialp.SerialPort(port,{
									baudrate: baud,
									parser: serialp.parsers.raw
							});
						}
                        else {
							obj.serial = new serialp.SerialPort(port,{
									baudrate: baud,
									parser: serialp.parsers.readline(newline)
							});
						}
                        obj.serial.on('error', function(err) {
                                util.log("[serial] serial port "+port+" error "+err);
                                obj.tout = setTimeout(function() {
                                        setupSerial();
                                },settings.serialReconnectTime);
                        });
                        obj.serial.on('close', function() {
                                if (!obj._closing) {
                                    util.log("[serial] serial port "+port+" closed unexpectedly");
                                    obj.tout = setTimeout(function() {
                                            setupSerial();
                                    },settings.serialReconnectTime);
                                }
                        });
                        obj.serial.on('open',function() {
                                util.log("[serial] serial port "+port+" opened at "+baud+" baud");
                                obj.serial.flush();
                                obj._emitter.emit('ready');
                        });
                        obj.serial.on('data',function(d) {
							if (typeof d !== "string") {
								d = d.toString();
								for (i=0; i<d.length; i++) {
									obj._emitter.emit('data',d.charAt(i));
								}
							}
							else {
                                obj._emitter.emit('data',d);
							}
                        });
                    }
                    setupSerial();
                    return obj;
                }();
            }
            return connections[id];
        },
        close: function(port) {
            if (connections[port]) {
                if (connections[port].tout != null) clearTimeout(connections[port].tout);
                connections[port]._closing = true;
                try {
                    connections[port].close(function() {
                            util.log("[serial] serial port closed");
                    });
                } catch(err) {
                };
            }
            delete connections[port];
        }
    }
}();

RED.app.get("/serialports",function(req,res) {
    serialp.list(function (err, ports) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(JSON.stringify(ports));
        res.end();
    });
});
