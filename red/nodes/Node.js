/**
 * Copyright 2014 IBM Corp.
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

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var clone = require("clone");
var when = require("when");

var flows = require("./flows");
var comms = require("../comms");

function Node(n) {
    this.id = n.id;
    flows.add(this);
    this.type = n.type;
    if (n.name) {
        this.name = n.name;
    }
    this.wires = n.wires || [];
}

util.inherits(Node, EventEmitter);

Node.prototype._on = Node.prototype.on;

Node.prototype.on = function(event, callback) {
    var node = this;
    if (event == "close") {
        if (callback.length == 1) {
            this.close = function() {
                return when.promise(function(resolve) {
                    callback.call(node, function() {
                        resolve();
                    });
                });
            };
        } else {
            this.close = callback;
        }
    } else {
        this._on(event, callback);
    }
};

Node.prototype.close = function() {};

function cloneMessage(msg) {
    // Temporary fix for #97
    // TODO: remove this http-node-specific fix somehow
    var req = msg.req;
    var res = msg.res;
    delete msg.req;
    delete msg.res;
    var m = clone(msg);
    if (req) {
        m.req = req;
        msg.req = req;
    }
    if (res) {
        m.res = res;
        msg.res = res;
    }
    return m;
}

Node.prototype.send = function(msg) {
    var msgSent = false;
    // instanceof doesn't work for some reason here
    if (msg === null || typeof msg === "undefined") {
        return;
    } else if (!util.isArray(msg)) {
        msg = [msg];
    }
    var numOutputs = this.wires.length;
    // for each output of node eg. [msgs to output 0, msgs to output 1, ...]
    for (var i = 0; i < numOutputs; i++) {
        var wires = this.wires[i]; // wires leaving output i
        if (i < msg.length) {
            var msgs = msg[i]; // msgs going to output i
            if (msgs !== null && typeof msgs !== "undefined") {
                if (!util.isArray(msgs)) {
                    msgs = [msgs];
                }
                var node;
                var k = 0;
                // for each recipent node of that output
                for (var j = 0; j < wires.length; j++) {
                    node = flows.get(wires[j]); // node at end of wire j
                    if (node) {
                        // for each msg to send eg. [[m1, m2, ...], ...]
                        for (k = 0; k < msgs.length; k++) {
                            if (msgSent) {
                                // a msg has already been sent so clone
                                node.receive(cloneMessage(msgs[k]));
                            } else {
                                // first msg sent so don't clone
                                node.receive(msgs[k]);
                                msgSent = true;
                            }
                        }
                    }
                }
            }
        }
    }
};

Node.prototype.receive = function(msg) {
    this.emit("input", msg);
};

function log_helper(self, level, msg) {
    var o = {
        level: level,
        id: self.id,
        type: self.type,
        msg: msg
    };
    if (self.name) {
        o.name = self.name;
    }
    self.emit("log", o);
}

Node.prototype.log = function(msg) {
    log_helper(this, 'log', msg);
};

Node.prototype.warn = function(msg) {
    log_helper(this, 'warn', msg);
};

Node.prototype.error = function(msg) {
    log_helper(this, 'error', msg);
};

/**
 * status: { fill:"red|green", shape:"dot|ring", text:"blah" }
 */
Node.prototype.status = function(status) {
    comms.publish("status/" + this.id, status, true);
};
module.exports = Node;
