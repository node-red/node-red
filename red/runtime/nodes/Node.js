/**
 * Copyright 2014, 2016 IBM Corp.
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
var router = require("./router");

function Node(n) {
    this.id = n.id;
    this.type = n.type;
    this.z = n.z;
    this._closeCallbacks = [];

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
    router.add(this,wires);
    this.wires = wires || [];
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
        this._on(event, callback);
    }
};

Node.prototype.close = function() {
    var promises = [];
    var node = this;
    for (var i=0;i<this._closeCallbacks.length;i++) {
        var callback = this._closeCallbacks[i];
        if (callback.length == 1) {
            promises.push(
                when.promise(function(resolve) {
                    callback.call(node, function() {
                        resolve();
                    });
                })
            );
        } else {
            callback.call(node);
        }
    }
    if (promises.length > 0) {
        return when.settle(promises).then(function() {
            router.remove(this);
            if (this._context) {
                context.delete(this._alias||this.id,this.z);
            }
        });
    } else {
        router.remove(this);
        if (this._context) {
            context.delete(this._alias||this.id,this.z);
        }
        return;
    }
};

Node.prototype.send = function(msg) {
    router.send(this,msg);
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
    Log.log(o);
}

Node.prototype.log = function(msg) {
    log_helper(this, Log.INFO, msg);
};

Node.prototype.warn = function(msg) {
    log_helper(this, Log.WARN, msg);
};

Node.prototype.error = function(logMessage,msg) {
    logMessage = logMessage || "";
    log_helper(this, Log.ERROR, logMessage);
    /* istanbul ignore else */
    if (msg) {
        flows.handleError(this,logMessage,msg);
    }
};

/**
 * If called with no args, returns whether metric collection is enabled
 */
Node.prototype.metric = function(eventname, msg, metricValue) {
    if (typeof eventname === "undefined") {
        return Log.metric();
    }
    var metrics = {};
    metrics.level = Log.METRIC;
    metrics.nodeid = this.id;
    metrics.event = "node."+this.type+"."+eventname;
    metrics.msgid = msg._msgid;
    metrics.value = metricValue;
    Log.log(metrics);
}

/**
 * status: { fill:"red|green", shape:"dot|ring", text:"blah" }
 */
Node.prototype.status = function(status) {
    flows.handleStatus(this,status);
};
module.exports = Node;
