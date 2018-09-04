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

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var when = require("when");

var redUtil = require("../util");
var Log = require("../log");
var context = require("./context");
var flows = require("./flows");

// Global timeout value in ms.
// This valie can be specified by `node_timeout` property in `settings.js`.
var _timeout = undefined;

function Node(n) {
    this.id = n.id;
    this.type = n.type;
    this.z = n.z;
    this._closeCallbacks = [];
    // record last received message for logging correlation for
    // old-style `send` function
    this._msgIn = undefined;

    if (n.name) {
        this.name = n.name;
    }
    if (n._alias) {
        this._alias = n._alias;
    }
    this.updateWires(n.wires);
}

util.inherits(Node, EventEmitter);

Node.prototype.updateWires = function(wires) {
    //console.log("UPDATE",this.id);
    this.wires = wires || [];
    delete this._wire;

    var wc = 0;
    this.wires.forEach(function(w) {
        wc+=w.length;
    });
    this._wireCount = wc;
    if (wc === 0) {
        // With nothing wired to the node, no-op send
        this.send = function(msg) {}
    } else {
        this.send = Node.prototype.send;
        if (this.wires.length === 1 && this.wires[0].length === 1) {
            // Single wire, so we can shortcut the send when
            // a single message is sent
            this._wire = this.wires[0][0];
        }
    }

}
Node.prototype.context = function() {
    if (!this._context) {
        this._context = context.get(this._alias||this.id,this.z);
    }
    return this._context;
}

Node.prototype._on = Node.prototype.on;

Node.prototype.on = function(event, callback) {
    var node = this;
    if (event == "close") {
        this._closeCallbacks.push(callback);
    } else {
        if (callback.length === 3) {
            // handle new style callback: `function(msg, send, done) {...}`
            this._on(event, function(msgIn) {
                var done = undefined;
                var timer = undefined;
                // setup timeout if specified
                function setupNodeTimeout() {
                    var timeout = node.getTimeout();
                    if (timeout) {
                        timer = setTimeout(function() {
                            // report error if timeout period exceeded
                            node.error(new Error("node execution timeout"),
                                       msgIn);
                        }, timeout);
                    }
                }
                function clearNodeTimeout() {
                    if (timer) {
                        clearTimeout(timer);
                    }
                }
                // define `done` callback with optimization
                if (node.maySendDone()) {
                    // if this node is specified as target of Done node,
                    // process `error` & `done`.
                    done = function (err, msg) {
                        clearNodeTimeout();
                        if (err) {
                            node.error(err, msg ? msg : msgIn);
                        }
                        else {
                            node.done(msg ? msg : msgIn);
                        }
                    };
                }
                else {
                    // otherwise do not need to process `done`.
                    done = function (err, msg) {
                        clearNodeTimeout();
                        if (err) {
                            node.error(err, msg ? msg : msgIn);
                        }
                    }
                }
                // define `send` callback
                var send = function(msg_out) {
                    node.send(msg_out, msgIn);
                }
                setupNodeTimeout();
                // save input message for old-style `send` function
                node._msgIn = msgIn;
                callback.call(node, msgIn, send, done);
            });
        }
        else {
            // handle old style callback: `function(msg) { ... }`
            this._on(event, function(msg) {
                // save input message for old-style `send` function
                node._msgIn = msg;
                callback.call(node, msg);
                // implicitly notify successful completion if this
                // node is target of `Done` node.
                if (node.maySendDone()) {
                    node.done(msg);
                }
            });
        }
    }
};

Node.prototype.close = function(removed) {
    //console.log(this.type,this.id,removed);
    var promises = [];
    var node = this;
    for (var i=0;i<this._closeCallbacks.length;i++) {
        var callback = this._closeCallbacks[i];
        if (callback.length > 0) {
            promises.push(
                when.promise(function(resolve) {
                    var args = [];
                    if (callback.length === 2) {
                        args.push(!!removed);
                    }
                    args.push(resolve);
                    callback.apply(node, args);
                })
            );
        } else {
            callback.call(node);
        }
    }
    if (promises.length > 0) {
        return when.settle(promises).then(function() {
            if (this._context) {
               return context.delete(this._alias||this.id,this.z);
            }
        });
    } else {
        if (this._context) {
            return context.delete(this._alias||this.id,this.z);
        }
        return;
    }
};

/**
 * msg: output message
 * inMsg: correlating input message
 */
Node.prototype.send = function(msg, inMsg) {
    var msgSent = false;
    var node;

    if (msg === null || typeof msg === "undefined") {
        return;
    } else if (!util.isArray(msg)) {
        if (this._wire) {
            // A single message and a single wire on output 0
            // TODO: pre-load flows.get calls - cannot do in constructor
            //       as not all nodes are defined at that point
            if (!msg._msgid) {
                msg._msgid = redUtil.generateId();
            }
            // log "send" metric.
            // (with correlating input message if specified)
            this.metric("send",msg, undefined, inMsg);
            node = flows.get(this._wire);
            /* istanbul ignore else */
            if (node) {
                node.receive(msg);
            }
            return;
        } else {
            msg = [msg];
        }
    }

    var numOutputs = this.wires.length;

    // Build a list of send events so that all cloning is done before
    // any calls to node.receive
    var sendEvents = [];

    var sentMessageId = null;

    // for each output of node eg. [msgs to output 0, msgs to output 1, ...]
    for (var i = 0; i < numOutputs; i++) {
        var wires = this.wires[i]; // wires leaving output i
        /* istanbul ignore else */
        if (i < msg.length) {
            var msgs = msg[i]; // msgs going to output i
            if (msgs !== null && typeof msgs !== "undefined") {
                if (!util.isArray(msgs)) {
                    msgs = [msgs];
                }
                var k = 0;
                // for each recipent node of that output
                for (var j = 0; j < wires.length; j++) {
                    node = flows.get(wires[j]); // node at end of wire j
                    if (node) {
                        // for each msg to send eg. [[m1, m2, ...], ...]
                        for (k = 0; k < msgs.length; k++) {
                            var m = msgs[k];
                            if (m !== null && m !== undefined) {
                                /* istanbul ignore else */
                                if (!sentMessageId) {
                                    sentMessageId = m._msgid;
                                }
                                if (msgSent) {
                                    var clonedmsg = redUtil.cloneMessage(m);
                                    sendEvents.push({n:node,m:clonedmsg});
                                } else {
                                    sendEvents.push({n:node,m:m});
                                    msgSent = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    /* istanbul ignore else */
    if (!sentMessageId) {
        sentMessageId = redUtil.generateId();
    }
    // log "send" metric.
    // (with correlating input message if specified)
    var msgIn = inMsg || this._msgIn; // use _msgIn for old-style send call
    this.metric("send",{_msgid:sentMessageId}, undefined, msgIn);

    for (i=0;i<sendEvents.length;i++) {
        var ev = sendEvents[i];
        /* istanbul ignore else */
        if (!ev.m._msgid) {
            ev.m._msgid = sentMessageId;
        }
        ev.n.receive(ev.m);
    }
};

Node.prototype.receive = function(msg) {
    if (!msg) {
        msg = {};
    }
    if (!msg._msgid) {
        msg._msgid = redUtil.generateId();
    }
    this.metric("receive",msg);
    try {
        this.emit("input", msg);
    } catch(err) {
        this.error(err,msg);
    }
};

Node.prototype.setTimeout = function(value) {
    this._timeout = value;
}

function log_helper(self, level, msg) {
    var o = {
        level: level,
        id: self.id,
        type: self.type,
        msg: msg
    };
    if (self._alias) {
        o._alias = self._alias;
    }
    if (self.z) {
        o.z = self.z;
    }
    if (self.name) {
        o.name = self.name;
    }
    Log.log(o);
}

Node.prototype.log = function(msg) {
    log_helper(this, Log.INFO, msg);
};

Node.prototype.warn = function(msg) {
    log_helper(this, Log.WARN, msg);
};

Node.prototype.error = function(logMessage,msg) {
    if (typeof logMessage != 'boolean') {
        logMessage = logMessage || "";
    }
    var handled = false;
    if (msg) {
        handled = flows.handleError(this,logMessage,msg);
    }
    if (!handled) {
        log_helper(this, Log.ERROR, logMessage);
    }
};

// true if node is candidate for handling by `Done` node.
// (see `Flow` function in `red/runtime/nodes/flows/Flow.js` for details)
Node.prototype.setCanSendDone = function(val) {
    this._canSendDone = val;
}

Node.prototype.maySendDone = function() {
    return (this._canSendDone !== false);
}

// notify successful completion of the node to `Done` node.
Node.prototype.done = function(msg) {
    try {
        flows.handleDone(this, msg);
    }
    catch(e) {
        console.log(e.stack);
        console.log(e);
    }
}

Node.prototype.debug = function(msg) {
    log_helper(this, Log.DEBUG, msg);
}

Node.prototype.trace = function(msg) {
    log_helper(this, Log.TRACE, msg);
}

/**
 * If called with no args, returns whether metric collection is enabled
 */
Node.prototype.metric = function(eventname, msg, metricValue, msgIn) {
    if (typeof eventname === "undefined") {
        return Log.metric();
    }
    var metrics = {};
    metrics.level = Log.METRIC;
    metrics.nodeid = this.id;
    metrics.event = "node."+this.type+"."+eventname;
    metrics.msgid = msg._msgid;
    // log correlating input message if `correlate_msg_in_out` is
    // specified in settings.js
    if (msgIn && Log.correlateMsgInOut()) {
        metrics.inMsgid = msgIn._msgid;
    }
    metrics.value = metricValue;
    Log.log(metrics);
}

/**
 * status: { fill:"red|green", shape:"dot|ring", text:"blah" }
 */
Node.prototype.status = function(status) {
    flows.handleStatus(this,status);
};


/**
 * timoeut set/get functions
 */

Node.prototype.getTimeout = function() {
    return this._timeout || Node.getTimeout();
}

Node.prototype.setTimeout = function(val) {
    this._timeout = val;
}

Node.getTimeout = function() {
    return _timeout;
}

Node.setTimeout = function(val) {
    _timeout = val;
}

Node.init = function(settings) {
    // record global timeout value specified by `node_timeout`
    // property in settings.js.
    if (settings && settings.hasOwnProperty("node_timeout")) {
        _timeout = settings.node_timeout;
    }
}

module.exports = Node;
