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
var blinkstick = require("blinkstick");

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) { if (obj.hasOwnProperty(key)) size++; }
    return size;
};

function BlinkStick(n) {
    RED.nodes.createNode(this,n);
    var p1 = /^\#[A-Fa-f0-9]{6}$/
    var p2 = /[0-9]+,[0-9]+,[0-9]+/
    this.led = blinkstick.findFirst(); // maybe try findAll() (one day)
    var node = this;

    this.on("input", function(msg) {
        if (msg != null) {
            if (Object.size(node.led) !== 0) {
                try {
                    if (p2.test(msg.payload)) {
                        var rgb = msg.payload.split(",");
                        node.led.setColor(parseInt(rgb[0])&255, parseInt(rgb[1])&255, parseInt(rgb[2])&255);
                    }
                    else {
                        node.led.setColor(msg.payload.toLowerCase().replace(/\s+/g,''));
                    }
                }
                catch (err) {
                    node.warn("BlinkStick missing ?");
                    node.led = blinkstick.findFirst();
                }
            }
            else {
                //node.warn("No BlinkStick found");
                node.led = blinkstick.findFirst();
            }
        }
    });
    if (Object.size(node.led) === 0) {
        node.error("No BlinkStick found");
    }

}

RED.nodes.registerType("blinkstick",BlinkStick);
