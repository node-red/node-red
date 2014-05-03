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

module.exports = function(RED) {
    var settings = RED.settings;
    var events = require("events");
    var util = require("util");
    var serialp = require("serialport");
    
    // TODO: 'serialPool' should be encapsulated in SerialPortNode
    
    function SerialPortNode(n) {
        RED.nodes.createNode(this,n);
        this.serialport = n.serialport;
        this.newline = n.newline;
        this.addchar = n.addchar || "false";
    
        this.serialbaud = parseInt(n.serialbaud) || 57600;
        this.databits = parseInt(n.databits) || 8;
        this.parity = n.parity || "none";
        this.stopbits = parseInt(n.stopbits) || 1;
    }
    RED.nodes.registerType("serial-port",SerialPortNode);
    
    function SerialOutNode(n) {
        RED.nodes.createNode(this,n);
        this.serial = n.serial;
        this.serialConfig = RED.nodes.getNode(this.serial);
    
        if (this.serialConfig) {
            var node = this;
            node.port = serialPool.get(this.serialConfig.serialport,
                this.serialConfig.serialbaud,
                this.serialConfig.databits,
                this.serialConfig.parity,
                this.serialConfig.stopbits,
                this.serialConfig.newline);
            node.addCh = "";
            if (node.serialConfig.addchar == "true") {
                node.addCh = this.serialConfig.newline.replace("\\n","\n").replace("\\r","\r");
            }
            node.on("input",function(msg) {
                var payload = msg.payload;
                if (!Buffer.isBuffer(payload)) {
                    if (typeof payload === "object") {
                        payload = JSON.stringify(payload);
                    } else {
                        payload = new String(payload);
                    }
                    payload += node.addCh;
                } else if (node.addCh !== "") {
                    payload = Buffer.concat([payload,new Buffer(node.addCh)]);
                }
                node.port.write(payload,function(err,res) {
                    if (err) {
                        node.error(err);
                    }
                });
            });
        } else {
            this.error("missing serial config");
        }
    
        this.on("close", function() {
            if (this.serialConfig) {
                serialPool.close(this.serialConfig.serialport);
            }
        });
    }
    RED.nodes.registerType("serial out",SerialOutNode);
    
    function SerialInNode(n) {
        RED.nodes.createNode(this,n);
        this.serial = n.serial;
        this.serialConfig = RED.nodes.getNode(this.serial);
    
        if (this.serialConfig) {
            var node = this;
            node.port = serialPool.get(this.serialConfig.serialport,
                this.serialConfig.serialbaud,
                this.serialConfig.databits,
                this.serialConfig.parity,
                this.serialConfig.stopbits,
                this.serialConfig.newline);
            this.port.on('data', function(msg) {
                node.send({ "payload": msg });
            });
        } else {
            this.error("missing serial config");
        }
    
        this.on("close", function() {
            if (this.serialConfig) {
                try {
                    serialPool.close(this.serialConfig.serialport);
                } catch(err) {
                }
            }
        });
    }
    RED.nodes.registerType("serial in",SerialInNode);
    
    
    var serialPool = function() {
        var connections = {};
        return {
            get:function(port,baud,databits,parity,stopbits,newline,callback) {
                var id = port;
                if (!connections[id]) {
                    connections[id] = function() {
                        var obj = {
                            _emitter: new events.EventEmitter(),
                            serial: null,
                            _closing: false,
                            tout: null,
                            on: function(a,b) { this._emitter.on(a,b); },
                            close: function(cb) { this.serial.close(cb); },
                            write: function(m,cb) { this.serial.write(m,cb); },
                        }
                        newline = newline.replace("\\n","\n").replace("\\r","\r");
                        var setupSerial = function() {
                            if (newline == "") {
                                obj.serial = new serialp.SerialPort(port,{
                                    baudrate: baud,
                                    databits: databits,
                                    parity: parity,
                                    stopbits: stopbits,
                                    parser: serialp.parsers.raw
                                },true, function(err, results) { if (err) obj.serial.emit('error',err); });
                            }
                            else {
                                obj.serial = new serialp.SerialPort(port,{
                                    baudrate: baud,
                                    databits: databits,
                                    parity: parity,
                                    stopbits: stopbits,
                                    parser: serialp.parsers.readline(newline)
                                },true, function(err, results) { if (err) obj.serial.emit('error',err); });
                            }
                            obj.serial.on('error', function(err) {
                                util.log("[serial] serial port "+port+" error "+err);
                                obj.tout = setTimeout(function() {
                                    setupSerial();
                                }, settings.serialReconnectTime);
                            });
                            obj.serial.on('close', function() {
                                if (!obj._closing) {
                                    util.log("[serial] serial port "+port+" closed unexpectedly");
                                    obj.tout = setTimeout(function() {
                                        setupSerial();
                                    }, settings.serialReconnectTime);
                                }
                            });
                            obj.serial.on('open',function() {
                                util.log("[serial] serial port "+port+" opened at "+baud+" baud "+databits+""+parity.charAt(0).toUpperCase()+stopbits);
                                if (obj.tout) { clearTimeout(obj.tout); }
                                //obj.serial.flush();
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
                    } catch(err) { };
                }
                delete connections[port];
            }
        }
    }();
    
    RED.httpAdmin.get("/serialports",function(req,res) {
        serialp.list(function (err, ports) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(JSON.stringify(ports));
            res.end();
        });
    });
}
