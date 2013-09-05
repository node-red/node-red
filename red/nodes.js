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
var util = require("util");
var events = require("events");
var fs = require("fs");


function getCallerFilename(type) {
    //if (type == "summary") {
    //    var err = new Error();
    //    console.log(err.stack);
    //    return null;
    //}
    // Save original Error.prepareStackTrace
    var origPrepareStackTrace = Error.prepareStackTrace;
    // Override with function that just returns `stack`
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    }
    // Create a new `Error`, which automatically gets `stack`
    var err = new Error();
    // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
    var stack = err.stack;
    // Restore original `Error.prepareStackTrace`
    Error.prepareStackTrace = origPrepareStackTrace;
    // Remove superfluous function call on stack
    stack.shift();
    stack.shift();
    return stack[0].getFileName();
}


var registry = (function() {
        var nodes = {};
        var logHandlers = [];
        var obj = {
            add: function(n) {
                nodes[n.id] = n;
                n.on("log",function(msg) {
                    for (var i in logHandlers) {
                        logHandlers[i].emit("log",msg);
                    }
                });
            },
            get: function(i) {
                return nodes[i];
            },
            clear: function() {
                for (var n in nodes) {
                    nodes[n].close();
                }
                nodes = {};
            },
            
            addLogHandler: function(handler) {
                logHandlers.push(handler);
            }
        }
        return obj;
})();

var ConsoleLogHandler = new events.EventEmitter();
ConsoleLogHandler.on("log",function(msg) {
        util.log("["+msg.level+"] ["+msg.type+":"+(msg.name||msg.id)+"] "+msg.msg);
});

registry.addLogHandler(ConsoleLogHandler);

var node_type_registry = (function() {
        var node_types = {};
        var node_configs = {};
        var obj = {
            register: function(type,node) {
                util.inherits(node, Node);
                
                var callerFilename = getCallerFilename(type);
                if (callerFilename == null) {
                    util.log("["+type+"] unable to determine filename");
                } else {
                    var configFilename = callerFilename.replace(/\.js$/,".html");
                    if (fs.existsSync(configFilename)) {
                        node_types[type] = node;
                        if (! node_configs[configFilename]) {
                            node_configs[configFilename] = fs.readFileSync(configFilename,'utf8');
                        }
                    } else {
                        util.log("["+type+"] missing template file: "+configFilename);
                    }
                }
            },
            get: function(type) {
                return node_types[type];
            },
            registerNodeConfig: function(type,config) {
                node_configs[type] = config;
            },
            getNodeConfigs: function() {
                var result = "";
                for (var nt in node_configs) {
                    result += node_configs[nt];
                }
                return result;
                
            }
        }
        return obj;
})();

function Node(n) {
    this.id = n.id;
    registry.add(this);
    this.type = n.type;
    if (n.name) {
        this.name = n.name;
    }
    this.wires = n.wires||[];
}
util.inherits(Node,events.EventEmitter);

Node.prototype.close = function() {
    // called when a node is removed
}


Node.prototype.send = function(msg) {
    // instanceof doesn't work for some reason here
    if (msg == null) {
        msg = [];
    } else if (!util.isArray(msg)) {
        msg = [msg];
    }
    for (var i in this.wires) {
        var wires = this.wires[i];
        if (i < msg.length) {
            for (var j in wires) {
                if (msg[i] != null) {
                    var msgs = msg[i];
                    if (!util.isArray(msg[i])) {
                        msgs = [msg[i]];
                    }
                    for (var k in msgs) {
                        var mm = msgs[k];
                        var m = {};
                        for (var p in mm) {
                            if (mm.hasOwnProperty(p)) {
                                m[p] = mm[p];
                            }
                        }
                        var node = registry.get(wires[j]);
                        if (node) {
                            node.receive(m);
                        }
                    }
                }
            }
        }
    }
}
module.exports.Node = Node;


Node.prototype.receive = function(msg) {
    this.emit("input",msg);
}

Node.prototype.log = function(msg) {
    var o = {level:'log',id:this.id, type:this.type, msg:msg};
    if (this.name) o.name = this.name;
    this.emit("log",o);
}
Node.prototype.warn = function(msg) {
    var o = {level:'warn',id:this.id, type:this.type, msg:msg};
    if (this.name) o.name = this.name;
    this.emit("log",o);
}
Node.prototype.error = function(msg) {
    var o = {level:'error',id:this.id, type:this.type, msg:msg};
    if (this.name) o.name = this.name;
    this.emit("log",o);
}




var credentials = {};
var credentialsFile = "credentials.json";
if (fs.existsSync(credentialsFile)) {
    credentials = JSON.parse(fs.readFileSync(credentialsFile,'utf8'));
}

function saveCredentialsFile() {
    fs.writeFile(credentialsFile, JSON.stringify(credentials), function(err) {
            if(err) {
                util.log(err);
            }
    });
}

module.exports.addCredentials = function(id,creds) {
    credentials[id] = creds;
    saveCredentialsFile();
}
module.exports.getCredentials = function(id) {
    return credentials[id];
}
module.exports.deleteCredentials = function(id) {
    delete credentials[id];
    saveCredentialsFile();
}


module.exports.createNode = function(node,def) {
    Node.call(node,def);
}

module.exports.registerType = node_type_registry.register;
module.exports.getNodeConfigs = node_type_registry.getNodeConfigs;
module.exports.addLogHandler = registry.addLogHandler;

module.exports.load = function() {
    function loadNodes(dir) {
        fs.readdirSync(dir).sort().filter(function(fn){
                var stats = fs.statSync(dir+"/"+fn);
                if (stats.isFile()) {
                    if (/\.js$/.test(fn)) {
                        try {
                            require("../"+dir+"/"+fn);
                        } catch(err) {
                            util.log("["+fn+"] "+err);
                            //console.log(err.stack);
                        }
                    }
                } else if (stats.isDirectory()) {
                    // Ignore /.dirs/ and /lib/
                    if (!/^(\..*|lib)$/.test(fn)) {
                        loadNodes(dir+"/"+fn);
                    }
                }
        });
    }
    
    loadNodes("nodes");
}



module.exports.getNode = function(nid) {
    return registry.get(nid);
}
module.exports.parseConfig = function(conf) {
    registry.clear();
    for (var i in conf) {
        var nn = null;
        var nt = node_type_registry.get(conf[i].type);
        if (nt) {
            nn = new nt(conf[i]);
        }
        // console.log(nn);
        if (nn == null) {
            util.log("[red] unknown type: "+conf[i].type);
        }
    }
    
    // Clean up any orphaned credentials
    var deletedCredentials = false;
    for (var c in credentials) {
        var n = registry.get(c);
        if (!n) {
            deletedCredentials = true;
            delete credentials[c];
        }
    }
    if (deletedCredentials) {
        saveCredentialsFile();
    }
}

