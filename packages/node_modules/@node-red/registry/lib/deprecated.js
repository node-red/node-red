/**
 * Copyright JS Foundation and other contributors, http://js.foundation
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

/*
 * This provides a list of node types that have at one time been included with
 * the core of Node-RED but have since moved out to their own module.
 *
 * If a user has a flow that depends on one of these types and they do not have
 * the new module installed, this will help them identify the missing module.
 */
var nodes = {
    "irc in":     {module:"node-red-node-irc"},
    "irc out":    {module:"node-red-node-irc"},
    "irc-server": {module:"node-red-node-irc"},

    "arduino in":    {module:"node-red-node-arduino"},
    "arduino out":   {module:"node-red-node-arduino"},
    "arduino-board": {module:"node-red-node-arduino"},

    "redis out": {module:"node-red-node-redis"},

    "mongodb": {module:"node-red-node-mongodb"},
    "mongodb out": {module:"node-red-node-mongodb"},

    "serial in": {module:"node-red-node-serialport"},
    "serial out": {module:"node-red-node-serialport"},
    "serial-port": {module:"node-red-node-serialport"},

    "twitter-credentials": {module:"node-red-node-twitter"},
    "twitter in": {module:"node-red-node-twitter"},
    "twitter out": {module:"node-red-node-twitter"},

    "e-mail": {module:"node-red-node-email"},
    "e-mail in": {module:"node-red-node-email"},

    "feedparse": {module:"node-red-node-feedparser"},

    "sentiment": {module:"node-red-node-sentiment"},

    "tail": {module:"node-red-node-tail"},

    "rpi-gpio in": {module:"node-red-node-pi-gpio"},
    "rpi-gpio out": {module:"node-red-node-pi-gpio"},
    "rpi-mouse": {module:"node-red-node-pi-gpio"},
    "rpi-keyboard": {module:"node-red-node-pi-gpio"}
}

module.exports = {
    get: function(id) {
        return nodes[id];
    }
}
