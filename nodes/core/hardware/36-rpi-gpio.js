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
    var exec = require('child_process').exec;
    var spawn = require('child_process').spawn;
    var fs =  require('fs');

    var gpioCommand = __dirname+'/nrgpio';

    if (!fs.existsSync("/dev/ttyAMA0")) { // unlikely if not on a Pi
        //RED.log.info("Ignoring Raspberry Pi specific node.");
        throw "Info : Ignoring Raspberry Pi specific node.";
    }

    if (!fs.existsSync("/usr/share/doc/python-rpi.gpio")) {
        RED.log.warn("Can't find Pi RPi.GPIO python library.");
        throw "Warning : Can't find Pi RPi.GPIO python library.";
    }

    if ( !(1 & parseInt ((fs.statSync(gpioCommand).mode & parseInt ("777", 8)).toString (8)[0]) )) {
        RED.log.error(gpioCommand+" needs to be executable.");
        throw "Error : nrgpio must to be executable.";
    }

    // the magic to make python print stuff immediately
    process.env.PYTHONUNBUFFERED = 1;

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
                node.warn("GPIO pin "+this.pin+" already set as "+pinTypes[pinsInUse[this.pin]]);
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
                node.child = null;
                node.running = false;
                if (RED.settings.verbose) { node.log("closed"); }
                if (node.done) {
                    node.status({fill:"grey",shape:"ring",text:"closed"});
                    node.done();
                }
                else { node.status({fill:"red",shape:"ring",text:"stopped"}); }
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") { node.error('nrgpio command not found'); }
                else if (err.errno === "EACCES") { node.error('nrgpio command not executable'); }
                else { node.error('error: ' + err.errno); }
            });

        }
        else {
            node.warn("Invalid GPIO pin: "+node.pin);
        }

        node.on("close", function(done) {
            node.status({fill:"grey",shape:"ring",text:"close"});
            delete pinsInUse[node.pin];
            if (node.child != null) {
                node.done = done;
                node.child.stdin.write("close "+node.pin);
                node.child.kill('SIGKILL');
            }
            else { done(); }
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
                node.warn("GPIO pin "+this.pin+" already set as "+pinTypes[pinsInUse[this.pin]]);
            }
        }

        function inputlistener(msg) {
            if (msg.payload === "true") { msg.payload = true; }
            if (msg.payload === "false") { msg.payload = false; }
            var out = Number(msg.payload);
            var limit = 1;
            if (node.out === "pwm") { limit = 100; }
            if ((out >= 0) && (out <= limit)) {
                if (RED.settings.verbose) { node.log("out: "+msg.payload); }
                if (node.child !== null) {
                    node.child.stdin.write(msg.payload+"\n");
                    node.status({fill:"green",shape:"dot",text:msg.payload.toString()});
                }
                else {
                    node.error("nrpgio python command not running");
                    node.status({fill:"red",shape:"ring",text:"not running"});
                }
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
                node.child = null;
                node.running = false;
                if (RED.settings.verbose) { node.log("closed"); }
                if (node.done) {
                    node.status({fill:"grey",shape:"ring",text:"closed"});
                    node.done();
                }
                else { node.status({fill:"red",shape:"ring",text:"stopped"}); }
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") { node.error('nrgpio command not found'); }
                else if (err.errno === "EACCES") { node.error('nrgpio command not executable'); }
                else { node.error('error: ' + err.errno); }
            });

        }
        else {
            node.warn("Invalid GPIO pin: "+node.pin);
        }

        node.on("close", function(done) {
            node.status({fill:"grey",shape:"ring",text:"close"});
            delete pinsInUse[node.pin];
            if (node.child != null) {
                node.done = done;
                node.child.stdin.write("close "+node.pin);
                node.child.kill('SIGKILL');
            }
            else { done(); }
        });

    }

    var pitype = { type:"" };
    exec(gpioCommand+" rev 0", function(err,stdout,stderr) {
        if (err) {
            RED.log.info('Version command failed for some reason.');
        }
        else {
            if (stdout.trim() == "0") { pitype = { type:"Compute" }; }
            else if (stdout.trim() == "1") { pitype = { type:"A/B v1" }; }
            else if (stdout.trim() == "2") { pitype = { type:"A/B v2" }; }
            else if (stdout.trim() == "3") { pitype = { type:"Model B+" }; }
            else { RED.log.info("Saw Pi Type",stdout.trim()); }
        }
    });
    RED.nodes.registerType("rpi-gpio out",GPIOOutNode);

    function PiMouseNode(n) {
        RED.nodes.createNode(this,n);
        this.butt = n.butt || 7;
        var node = this;

        node.child = spawn(gpioCommand+".py", ["mouse",node.butt]);
        node.status({fill:"green",shape:"dot",text:"OK"});

        node.child.stdout.on('data', function (data) {
            data = Number(data);
            if (data === 0) { node.send({ topic:"pi/mouse", button:data, payload:0 }); }
            else { node.send({ topic:"pi/mouse", button:data, payload:1 }); }
        });

        node.child.stderr.on('data', function (data) {
            if (RED.settings.verbose) { node.log("err: "+data+" :"); }
        });

        node.child.on('close', function (code) {
            node.child = null;
            node.running = false;
            if (RED.settings.verbose) { node.log("closed"); }
            if (node.done) {
                node.status({fill:"grey",shape:"ring",text:"closed"});
                node.done();
            }
            else { node.status({fill:"red",shape:"ring",text:"stopped"}); }
        });

        node.child.on('error', function (err) {
            if (err.errno === "ENOENT") { node.error('nrgpio command not found'); }
            else if (err.errno === "EACCES") { node.error('nrgpio ommand not executable'); }
            else { node.error('error: ' + err.errno); }
        });

        node.on("close", function(done) {
            node.status({fill:"grey",shape:"ring",text:"close"});
            if (node.child != null) {
                node.done = done;
                node.child.kill('SIGINT');
                node.child = null;
            }
            else { done(); }
        });
    }
    RED.nodes.registerType("rpi-mouse",PiMouseNode);

    RED.httpAdmin.get('/rpi-gpio/:id', RED.auth.needsPermission('rpi-gpio.read'), function(req,res) {
        res.json(pitype);
    });

    RED.httpAdmin.get('/rpi-pins/:id', RED.auth.needsPermission('rpi-gpio.read'), function(req,res) {
        res.json(pinsInUse);
    });
}
