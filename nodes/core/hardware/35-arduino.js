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
    
    var util = require("util");
    var firmata = require("firmata");
    var arduinoReady = false;
    var thisboard = null;
    
    // The Board Definition - this opens (and closes) the connection
    function ArduinoNode(n) {
        RED.nodes.createNode(this,n);
        this.device = n.device;
        this.repeat = n.repeat||25;
        util.log("[firmata] Opening "+this.device);
        var node = this;
    
        node.toun = setInterval(function() {
            if (!arduinoReady) {
                if (thisboard == null) {
                    node.board = new firmata.Board(node.device, function(err) {
                        if (err) {
                            util.log("[firmata] error: "+err);
                            return;
                        }
                        arduinoReady = true;
                        thisboard = node.board;
                        clearInterval(node.toun);
                        util.log('[firmata] Arduino connected');
                    });
                }
                else {
                    node.board = thisboard;
                    node.board.removeAllListeners();
                    arduinoReady = true;
                    clearInterval(node.toun);
                    node.toun = false;
                    util.log("[firmata] Arduino already connected");
                }
            } else { util.log("[firmata] Waiting for Firmata"); }
        }, 10000); // wait for firmata to connect to arduino
    
        this.on('close', function() {
            //this.board.sp.close(function() { console.log("[firmata] Serial port closed"); arduinoReady = false; });
            arduinoReady = false;
            if (node.toun) {
                clearInterval(node.toun);
                util.log("[firmata] arduino wait loop stopped");
            }
            util.log("[firmata] Stopped");
        });
    }
    RED.nodes.registerType("arduino-board",ArduinoNode);
    
    
    // The Input Node
    function DuinoNodeIn(n) {
        RED.nodes.createNode(this,n);
        this.buttonState = -1;
        this.pin = n.pin;
        this.state = n.state;
        this.arduino = n.arduino;
        this.serverConfig = RED.nodes.getNode(this.arduino);
        if (typeof this.serverConfig === "object") {
            this.board = this.serverConfig.board;
            this.repeat = this.serverConfig.repeat;
            var node = this;
    
            node.toui = setInterval(function() {
                if (thisboard != null) {
                    node.board = thisboard;
                    clearInterval(node.toui);
                    node.toui = false;
                    //console.log("i",node.state,node.pin,node.board.MODES[node.state]);
                    node.board.pinMode(node.pin, node.board.MODES[node.state]);
                    node.board.setSamplingInterval(node.repeat);
                    var oldrdg = "";
                    if (node.state == "ANALOG") {
                        node.board.analogRead(node.pin, function(data) {
                            var msg = {payload:data, topic:"A"+node.pin};
                            if (data != oldrdg) {
                                node.send(msg);
                                oldrdg = data;
                            }
                        });
                    }
                    else {
                        node.board.digitalRead(node.pin, function(data) {
                            var msg = {payload:data, topic:node.pin};
                            node.send(msg);
                        });
                    }
                }
                else { node.log("Waiting for Arduino"); }
            }, 5000); // loop to wait for firmata to connect to arduino
    
            this.on('close', function() {
                if (node.toui) {
                    clearInterval(node.toui);
                    util.log("[firmata] input wait loop stopped");
                }
            });
        }
        else {
            util.log("[firmata] Serial Port not Configured");
        }
    }
    RED.nodes.registerType("arduino in",DuinoNodeIn);
    
    
    // The Output Node
    function DuinoNodeOut(n) {
        RED.nodes.createNode(this,n);
        this.buttonState = -1;
        this.pin = n.pin;
        this.state = n.state;
        this.arduino = n.arduino;
        this.serverConfig = RED.nodes.getNode(this.arduino);
        if (typeof this.serverConfig === "object") {
            this.board = this.serverConfig.board;
            var node = this;
    
            this.on("input", function(msg) {
                //console.log(msg);
                if (node.board != null) {
                    if (node.state == "OUTPUT") {
                        if ((msg.payload == true)||(msg.payload == 1)||(msg.payload.toString().toLowerCase() == "on")) {
                            node.board.digitalWrite(node.pin, node.board.HIGH);
                        }
                        if ((msg.payload == false)||(msg.payload == 0)||(msg.payload.toString().toLowerCase() == "off")) {
                            node.board.digitalWrite(node.pin, node.board.LOW);
                        }
                    }
                    if (node.state == "PWM") {
                        msg.payload = msg.payload * 1;
                        if ((msg.payload >= 0) && (msg.payload <= 255)) {
                            //console.log(msg.payload, node.pin);
                            node.board.servoWrite(node.pin, msg.payload);
                        }
                    }
                    if (node.state == "SERVO") {
                        msg.payload = msg.payload * 1;
                        if ((msg.payload >= 0) && (msg.payload <= 180)) {
                            //console.log(msg.payload, node.pin);
                            node.board.servoWrite(node.pin, msg.payload);
                        }
                    }
                }
                //else { console.log("Arduino not ready"); }
            });
    
            node.touo = setInterval(function() {
                if (thisboard != null) {
                    clearInterval(node.touo);
                    node.touo = false;
                    node.board = thisboard;
                    //console.log("o",node.state,node.pin,node.board.MODES[node.state]);
                    node.board.pinMode(node.pin, node.board.MODES[node.state]);
                }
                else { util.log("[firmata] waiting for arduino to connect"); }
            }, 5000); // loop to wait for firmata to connect to arduino
    
            this.on('close', function() {
                if (node.touo) {
                    clearInterval(node.touo);
                    util.log("[firmata] output wait loop stopped");
                }
            });
        }
        else {
            util.log("[firmata] Serial Port not Configured");
        }
    }
    RED.nodes.registerType("arduino out",DuinoNodeOut);
}
