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
    this.wires = n.wires||[];
}

util.inherits(Node,EventEmitter);

Node.prototype._on = Node.prototype.on;

Node.prototype.on = function(event,callback) {
    var node = this;
    if (event == "close") {
        if (callback.length == 1) {
            this.close = function() {
                return when.promise(function(resolve) {
                    callback.call(node,function() {
                        resolve();
                    });
                });
            }
        } else {
            this.close = callback;
        }
    } else {
        this._on(event,callback);
    }
}

Node.prototype.close = function() {
}

Node.prototype.send = function(msg) {
    // instanceof doesn't work for some reason here
    if (msg == null) {
        return;
    } else if (!util.isArray(msg)) {
        msg = [msg];
    }
    for (var i=0;i<this.wires.length;i++) {
        var wires = this.wires[i];
        if (i < msg.length) {
            if (msg[i] != null) {
                var msgs = msg[i];
                if (!util.isArray(msg[i])) {
                    msgs = [msg[i]];
                }
                //if (wires.length == 1) {
                //    // Single recipient, don't need to clone the message
                //    var node = flows.get(wires[0]);
                //    if (node) {
                //        for (var k in msgs) {
                //            var mm = msgs[k];
                //            node.receive(mm);
                //        }
                //    }
                //} else {
                    // Multiple recipients, must send message copies
                    for (var j=0;j<wires.length;j++) {
                        var node = flows.get(wires[j]);
                        if (node) {
                            for (var k=0;k<msgs.length;k++) {
                                var mm = msgs[k];
                                // Temporary fix for #97
                                // TODO: remove this http-node-specific fix somehow
                                var req = mm.req;
                                var res = mm.res;
                                delete mm.req;
                                delete mm.res;
                                var m = clone(mm);
                                if (req) {
                                    m.req = req;
                                    mm.req = req;
                                }
                                if (res) {
                                    m.res = res;
                                    mm.res = res;
                                }
                                node.receive(m);
                            }
                        }
                    }
                //}
            }
        }
    }
}

Node.prototype.receive = function(msg) {
    this.emit("input",msg);
}

function log_helper(self, level, msg) {
    var o = {level:level, id:self.id, type:self.type, msg:msg};
    if (self.name) {
        o.name = self.name;
    }
    self.emit("log",o);
}

Node.prototype.log = function(msg) {
    log_helper(this, 'log', msg);
}

Node.prototype.warn = function(msg) {
    log_helper(this, 'warn', msg);
}

Node.prototype.error = function(msg) {
    log_helper(this, 'error', msg);
}

/**
 * status: { fill:"red|green", shape:"dot|ring", text:"blah" }
 */
Node.prototype.status = function(status) {
    comms.publish("status/"+this.id,status,true);
}
module.exports = Node;
