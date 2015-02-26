/**
* Copyright 2013,2014 IBM Corp.
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
    var settings = RED.settings;
    var events = require("events");
    var serialp = require("serialport");
    var bufMaxSize = 32768;  // Max serial buffer size, for inputs...

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
        this.bin = n.bin || "false";
        this.out = n.out || "char";
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
                node.addCh = this.serialConfig.newline.replace("\\n","\n").replace("\\r","\r").replace("\\t","\t").replace("\\e","\e").replace("\\f","\f").replace("\\0","\0");
            }
            node.on("input",function(msg) {
                var payload = msg.payload;
                if (!Buffer.isBuffer(payload)) {
                    if (typeof payload === "object") {
                        payload = JSON.stringify(payload);
                    } else {
                        payload = payload.toString();
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
            node.port.on('ready', function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });
            node.port.on('closed', function() {
                node.status({fill:"red",shape:"ring",text:"not connected"});
            });
        } else {
            this.error("missing serial config");
        }

        this.on("close", function(done) {
            if (this.serialConfig) {
                serialPool.close(this.serialConfig.serialport,done);
            } else {
                done();
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
            node.tout = null;
            var buf;
            if (node.serialConfig.out != "count") { buf = new Buffer(bufMaxSize); }
            else { buf = new Buffer(Number(node.serialConfig.newline)); }
            var i = 0;
            node.status({fill:"grey",shape:"dot",text:"unknown"});
            node.port = serialPool.get(this.serialConfig.serialport,
                this.serialConfig.serialbaud,
                this.serialConfig.databits,
                this.serialConfig.parity,
                this.serialConfig.stopbits,
                this.serialConfig.newline
            );

            var splitc;
            if (node.serialConfig.newline.substr(0,2) == "0x") {
                splitc = new Buffer([parseInt(node.serialConfig.newline)]);
            } else {
                splitc = new Buffer(node.serialConfig.newline.replace("\\n","\n").replace("\\r","\r").replace("\\t","\t").replace("\\e","\e").replace("\\f","\f").replace("\\0","\0"));
            }

            this.port.on('data', function(msg) {
                // single char buffer
                if ((node.serialConfig.newline === 0)||(node.serialConfig.newline === "")) {
                    if (node.serialConfig.bin !== "bin") { node.send({"payload": String.fromCharCode(msg)}); }
                    else { node.send({"payload": new Buffer([msg])}); }
                }
                else {
                    // do the timer thing
                    if (node.serialConfig.out === "time")  {
                        if (node.tout) {
                            i += 1;
                            buf[i] = msg;
                        }
                        else {
                            node.tout = setTimeout(function () {
                                node.tout = null;
                                var m = new Buffer(i+1);
                                buf.copy(m,0,0,i+1);
                                if (node.serialConfig.bin !== "bin") { m = m.toString(); }
                                node.send({"payload": m});
                                m = null;
                            }, node.serialConfig.newline);
                            i = 0;
                            buf[0] = msg;
                        }
                    }
                    // count bytes into a buffer...
                    else if (node.serialConfig.out === "count") {
                        buf[i] = msg;
                        i += 1;
                        if ( i >= parseInt(node.serialConfig.newline)) {
                            var m = new Buffer(i);
                            buf.copy(m,0,0,i);
                            if (node.serialConfig.bin !== "bin") { m = m.toString(); }
                            node.send({"payload":m});
                            m = null;
                            i = 0;
                        }
                    }
                    // look to match char...
                    else if (node.serialConfig.out === "char") {
                        buf[i] = msg;
                        i += 1;
                        if ((msg === splitc[0]) || (i === bufMaxSize)) {
                            var m = new Buffer(i);
                            buf.copy(m,0,0,i);
                            if (node.serialConfig.bin !== "bin") { m = m.toString(); }
                            node.send({"payload":m});
                            m = null;
                            i = 0;
                        }
                    }
                    else { node.log("should never get here"); }
                }
            });
            this.port.on('ready', function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });
            this.port.on('closed', function() {
                node.status({fill:"red",shape:"ring",text:"not connected"});
            });
        } else {
            this.error("missing serial config");
        }

        this.on("close", function(done) {
            if (this.serialConfig) {
                serialPool.close(this.serialConfig.serialport,done);
            } else {
                done();
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
                        //newline = newline.replace("\\n","\n").replace("\\r","\r");
                        var setupSerial = function() {
                            //if (newline == "") {
                                obj.serial = new serialp.SerialPort(port,{
                                    baudrate: baud,
                                    databits: databits,
                                    parity: parity,
                                    stopbits: stopbits,
                                    parser: serialp.parsers.raw
                                },true, function(err, results) { if (err) { obj.serial.emit('error',err); } });
                            //}
                            //else {
                            //    obj.serial = new serialp.SerialPort(port,{
                            //        baudrate: baud,
                            //        databits: databits,
                            //        parity: parity,
                            //        stopbits: stopbits,
                            //        parser: serialp.parsers.readline(newline)
                            //    },true, function(err, results) { if (err) obj.serial.emit('error',err); });
                            //}
                            obj.serial.on('error', function(err) {
                                RED.log.error("serial port "+port+" error "+err);
                                obj._emitter.emit('closed');
                                obj.tout = setTimeout(function() {
                                    setupSerial();
                                }, settings.serialReconnectTime);
                            });
                            obj.serial.on('close', function() {
                                if (!obj._closing) {
                                    RED.log.error("serial port "+port+" closed unexpectedly");
                                    obj._emitter.emit('closed');
                                    obj.tout = setTimeout(function() {
                                        setupSerial();
                                    }, settings.serialReconnectTime);
                                }
                            });
                            obj.serial.on('open',function() {
                                RED.log.info("serial port "+port+" opened at "+baud+" baud "+databits+""+parity.charAt(0).toUpperCase()+stopbits);
                                if (obj.tout) { clearTimeout(obj.tout); }
                                //obj.serial.flush();
                                obj._emitter.emit('ready');
                            });
                            obj.serial.on('data',function(d) {
                                //console.log(Buffer.isBuffer(d),d.length,d);
                                //if (typeof d !== "string") {
                                //    //d = d.toString();
                                    for (var z=0; z<d.length; z++) {
                                        obj._emitter.emit('data',d[z]);
                                    }
                                //}
                                //else {
                                //    obj._emitter.emit('data',d);
                                //}
                            });
                            obj.serial.on("disconnect",function() {
                                RED.log.error("serial port "+port+" gone away");
                            });
                        }
                        setupSerial();
                        return obj;
                    }();
                }
                return connections[id];
            },
            close: function(port,done) {
                if (connections[port]) {
                    if (connections[port].tout != null) {
                        clearTimeout(connections[port].tout);
                    }
                    connections[port]._closing = true;
                    try {
                        connections[port].close(function() {
                            RED.log.info("serial port closed");
                            done();
                        });
                    }
                    catch(err) { }
                    delete connections[port];
                } else {
                    done();
                }
            }
        }
    }();

    RED.httpAdmin.get("/serialports", RED.auth.needsPermission('serial.read'), function(req,res) {
        serialp.list(function (err, ports) {
            res.json(ports);
        });
    });
}
