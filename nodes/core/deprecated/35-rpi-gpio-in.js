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

var RED = require(process.env.NODE_RED_HOME+"/red/red");
var gpio = require("pi-gpio");

function GPIOInNode(n) {
    RED.nodes.createNode(this,n);
    this.warn("node type deprecated - will be removed in a future release");
    this.buttonState = -1;
    this.pin = n.pin;
    this.resistor = n.resistor;

    var node = this;

    if (this.pin) {
        var setupPin =  function(err) {
            if (err) {
                node.error(err);
            } else {
                node._interval = setInterval(function(){
                        gpio.read(node.pin, function(err, value) {
                                if(err){
                                    node.error(err);
                                } else{
                                    if(node.buttonState !== value){
                                        var previousState = node.buttonState;
                                        node.buttonState = value;
                                        if (previousState !== -1) {
                                            var msg = {payload:node.buttonState};
                                            node.send(msg);
                                        }
                                    }
                                }
                        });
                }, 50);
            }
        };
        if (this.resistor == "no") {
            gpio.open(this.pin,"input",setupPin());
        } else {
            // Assume enabled externally via gpio-admin
            setupPin();
        }
    } else {
        this.error("Invalid GPIO pin: "+this.pin);
    }
}

RED.nodes.registerType("rpi-gpio in",GPIOInNode);

GPIOInNode.prototype.close = function() {
    clearInterval(this._interval);
    if (this.resistor == "no") {
        gpio.close(this.pin);
    }
}
