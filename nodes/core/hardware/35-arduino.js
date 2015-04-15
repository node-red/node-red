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
    var ArduinoFirmata = require('arduino-firmata');
    var fs = require('fs');
    var portlist = ArduinoFirmata.list(function (err, ports) {
        portlist = ports;
    });

    // The Board Definition - this opens (and closes) the connection
    function ArduinoNode(n) {
        RED.nodes.createNode(this,n);
        this.device = n.device || null;
        this.repeat = n.repeat||25;
        //node.log("opening connection "+this.device);
        var node = this;
        node.board = new ArduinoFirmata();
        if (portlist.indexOf(node.device) === -1) {
            node.error("device "+node.device+" not found");
        }
        else {
            node.board.connect(node.device);
        }

        node.board.on('boardReady', function(){
            if (RED.settings.verbose) { node.log("version "+node.board.boardVersion); }
        });

        node.on('close', function(done) {
            if (node.board) {
                try {
                    node.board.close(function() {
                        done();
                        if (RED.settings.verbose) { node.log("port closed"); }
                    });
                } catch(e) { done(); }
            } else { done(); }
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
            var node = this;
            node.status({fill:"red",shape:"ring",text:"connecting"});
            node.board.on('connect', function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
                //console.log("i",node.state,node.pin);
                if (node.state == "ANALOG") {
                    node.board.on('analogChange', function(e) {
                        if (e.pin == node.pin) {
                            var msg = {payload:e.value, topic:"A"+e.pin};
                            node.send(msg);
                        }
                    });
                }
                if (node.state == "INPUT") {
                    node.board.pinMode(node.pin, ArduinoFirmata.INPUT);
                    node.board.on('digitalChange', function(e) {
                        if (e.pin == node.pin) {
                            var msg = {payload:e.value, topic:e.pin};
                            node.send(msg);
                        }
                    });
                }
                if (node.state == "SYSEX") {
                    node.board.on('sysex', function(e) {
                        var msg = {payload:e, topic:"sysex"};
                        node.send(msg);
                    });
                }
            });
        }
        else {
            this.warn("port not configured");
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
            node.status({fill:"red",shape:"ring",text:"connecting"});

            node.board.on('connect', function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
                //console.log("o",node.state,node.pin);
                node.board.pinMode(node.pin, node.state);
                node.on("input", function(msg) {
                    if (node.state === "OUTPUT") {
                        if ((msg.payload === true)||(msg.payload.toString() == "1")||(msg.payload.toString().toLowerCase() == "on")) {
                            node.board.digitalWrite(node.pin, true);
                        }
                        if ((msg.payload === false)||(msg.payload.toString() == "0")||(msg.payload.toString().toLowerCase() == "off")) {
                            node.board.digitalWrite(node.pin, false);
                        }
                    }
                    if (node.state === "PWM") {
                        msg.payload = msg.payload * 1;
                        if ((msg.payload >= 0) && (msg.payload <= 255)) {
                            node.board.analogWrite(node.pin, msg.payload);
                        }
                    }
                    if (node.state === "SERVO") {
                        msg.payload = msg.payload * 1;
                        if ((msg.payload >= 0) && (msg.payload <= 180)) {
                            node.board.servoWrite(node.pin, msg.payload);
                        }
                    }
                    if (node.state === "SYSEX") {
                        node.board.sysex(msg.payload);
                    }
                });
            });
        }
        else {
            this.warn("port not configured");
        }
    }
    RED.nodes.registerType("arduino out",DuinoNodeOut);

    RED.httpAdmin.get("/arduinoports", RED.auth.needsPermission("arduino.read"), function(req,res) {
        ArduinoFirmata.list(function (err, ports) {
            res.json(ports);
        });
    });
}
