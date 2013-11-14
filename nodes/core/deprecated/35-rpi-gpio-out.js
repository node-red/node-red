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

function GPIOOutNode(n) {
    RED.nodes.createNode(this,n);
    this.warn("node type deprecated - will be removed in a future release");
    this.pin = n.pin;

    var node = this;

    if (this.pin) {
        gpio.open(this.pin,"output",function(err) {
            if (err) {
                node.error(err);
            } else {
                node.on("input",function(msg) {
                        gpio.write(node.pin,msg.payload,function(err) {
                                if (err) node.error(err);
                        });
                });
            }
        });
    } else {
        this.error("Invalid GPIO pin: "+this.pin);
    }
}

RED.nodes.registerType("rpi-gpio out",GPIOOutNode);

GPIOOutNode.prototype.close = function() {
    gpio.close(this.pin);
}
