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
    var util = require("util");
    var exec = require('child_process').exec;
    var spawn = require('child_process').spawn;
    var fs =  require('fs');

    var gpioCommand = __dirname+'/nrgpio';

    if (!fs.existsSync("/dev/ttyAMA0")) { // unlikely if not on a Pi
        //util.log("Info : Ignoring Raspberry Pi specific node.");
        throw "Info : Ignoring Raspberry Pi specific node.";
    }

    if (!fs.existsSync("/usr/share/doc/python-rpi.gpio")) {
        util.log("[rpi-gpio] Info : Can't find Pi RPi.GPIO python library.");
        throw "Warning : Can't find Pi RPi.GPIO python library.";
    }

    if ( !(1 & parseInt ((fs.statSync(gpioCommand).mode & parseInt ("777", 8)).toString (8)[0]) )) {
        util.log("[rpi-gpio] Error : "+gpioCommand+" needs to be executable.");
        throw "Error : nrgpio must to be executable.";
    }

    var pinsInUse = {};
    var pinTypes = {"out":"digital output", "tri":"input", "up":"input with pull up", "down":"input with pull down", "pwm":"PWM output"};

    function GPIOInNode(n) {
        RED.nodes.createNode(this,n);
        this.buttonState = -1;
        this.pin = n.pin;
        this.intype = n.intype;
        this.read = n.read || false;
        if (this.read) { this.buttonState = -2; }
        var node = this;
        if (!pinsInUse.hasOwnProperty(this.pin)) {
            pinsInUse[this.pin] = this.intype;
        }
        else {
            if ((pinsInUse[this.pin] !== this.intype)||(pinsInUse[this.pin] === "pwm")) {
                node.error("GPIO pin "+this.pin+" already set as "+pinTypes[pinsInUse[this.pin]]);
            }
        }

        if (node.pin !== undefined) {
            if (node.intype === "tri") {
                node.child = spawn(gpioCommand, ["in",node.pin]);
            } else {
                node.child = spawn(gpioCommand, ["in",node.pin,node.intype]);
            }
            node.running = true;
            node.status({fill:"green",shape:"dot",text:"OK"});

            node.child.stdout.on('data', function (data) {
                data = data.toString().trim();
                if (data.length > 0) {
                    if (node.buttonState !== -1) {
                        node.send({ topic:"pi/"+node.pin, payload:Number(data) });
                    }
                    node.buttonState = data;
                    node.status({fill:"green",shape:"dot",text:data});
                    if (RED.settings.verbose) { node.log("out: "+data+" :"); }
                }
            });

            node.child.stderr.on('data', function (data) {
                if (RED.settings.verbose) { node.log("err: "+data+" :"); }
            });

            node.child.on('close', function (code) {
                if (RED.settings.verbose) { node.log("ret: "+code+" :"); }
                node.child = null;
                node.running = false;
                node.status({fill:"red",shape:"circle",text:""});
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") { node.warn('Command not found'); }
                else if (err.errno === "EACCES") { node.warn('Command not executable'); }
                else { node.log('error: ' + err); }
            });

        }
        else {
            node.error("Invalid GPIO pin: "+node.pin);
        }

        node.on("close", function() {
            if (node.child != null) {
                node.child.stdin.write(" close "+node.pin);
                node.child.kill('SIGKILL');
            }
            node.status({fill:"red",shape:"circle",text:""});
            delete pinsInUse[node.pin];
            if (RED.settings.verbose) { node.log("end"); }
        });
    }
    RED.nodes.registerType("rpi-gpio in",GPIOInNode);


    function GPIOOutNode(n) {
        RED.nodes.createNode(this,n);
        this.pin = n.pin;
        this.set = n.set || false;
        this.level = n.level || 0;
        this.out = n.out || "out";
        var node = this;
        if (!pinsInUse.hasOwnProperty(this.pin)) {
            pinsInUse[this.pin] = this.out;
        }
        else {
            if ((pinsInUse[this.pin] !== this.out)||(pinsInUse[this.pin] === "pwm")) {
                node.error("GPIO pin "+this.pin+" already set as "+pinTypes[pinsInUse[this.pin]]);
            }
        }

        function inputlistener(msg) {
            if (msg.payload === "true") { msg.payload = true; }
            if (msg.payload === "false") { msg.payload = false; }
            var out = Number(msg.payload);
            var limit = 1;
            if (node.out === "pwm") { limit = 100; }
            if ((out >= 0) && (out <= limit)) {
                if (RED.settings.verbose) { node.log("inp: "+msg.payload); }
                if (node.child !== null) { node.child.stdin.write(msg.payload+"\n"); }
                else { node.warn("Command not running"); }
                node.status({fill:"green",shape:"dot",text:msg.payload});
            }
            else { node.warn("Invalid input: "+out); }
        }

        if (node.pin !== undefined) {
            if (node.set && (node.out === "out")) {
                node.child = spawn(gpioCommand, [node.out,node.pin,node.level]);
                } else {
                node.child = spawn(gpioCommand, [node.out,node.pin]);
            }
            node.running = true;
            node.status({fill:"green",shape:"dot",text:"OK"});

            node.on("input", inputlistener);

            node.child.stdout.on('data', function (data) {
                if (RED.settings.verbose) { node.log("out: "+data+" :"); }
            });

            node.child.stderr.on('data', function (data) {
                if (RED.settings.verbose) { node.log("err: "+data+" :"); }
            });

            node.child.on('close', function (code) {
                if (RED.settings.verbose) { node.log("ret: "+code+" :"); }
                node.child = null;
                node.running = false;
                node.status({fill:"red",shape:"circle",text:""});
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") { node.warn('Command not found'); }
                else if (err.errno === "EACCES") { node.warn('Command not executable'); }
                else { node.log('error: ' + err); }
            });

        }
        else {
            node.error("Invalid GPIO pin: "+node.pin);
        }

        node.on("close", function() {
            if (node.child != null) {
                node.child.stdin.write(" close "+node.pin);
                node.child.kill('SIGKILL');
            }
            node.status({fill:"red",shape:"circle",text:""});
            delete pinsInUse[node.pin];
            if (RED.settings.verbose) { node.log("end"); }
        });

    }

    var pitype = { type:"" };
    exec(gpioCommand+" rev 0", function(err,stdout,stderr) {
        if (err) {
            console.log('[rpi-gpio] Version command failed for some reason.');
        }
        else {
            if (stdout.trim() == "0") { pitype = { type:"Compute" }; }
            else if (stdout.trim() == "1") { pitype = { type:"A/B v1" }; }
            else if (stdout.trim() == "2") { pitype = { type:"A/B v2" }; }
            else if (stdout.trim() == "3") { pitype = { type:"Model B+" }; }
            else { console.log("SAW Pi TYPE",stdout.trim()); }
        }
    });
    RED.nodes.registerType("rpi-gpio out",GPIOOutNode);

    RED.httpAdmin.get('/rpi-gpio/:id',function(req,res) {
        res.send( JSON.stringify(pitype) );
    });

    RED.httpAdmin.get('/rpi-pins/:id',function(req,res) {
        res.send( JSON.stringify(pinsInUse) );
    });
}
