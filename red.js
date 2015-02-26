#!/usr/bin/env node
/**
 * Copyright 2013, 2015 IBM Corp.
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
var http = require('http');
var https = require('https');
var util = require("util");
var express = require("express");
var crypto = require("crypto");
var nopt = require("nopt");
var path = require("path");
var fs = require("fs");
var RED = require("./red/red.js");

var server;
var app = express();

var settingsFile;
var flowFile;

var knownOpts = {
    "settings":[path],
    "userDir":[path],
    "v": Boolean,
    "help": Boolean
};
var shortHands = {
    "s":["--settings"],
    "u":["--userDir"],
    "?":["--help"]
};
nopt.invalidHandler = function(k,v,t) {
    // TODO: console.log(k,v,t);
}

var parsedArgs = nopt(knownOpts,shortHands,process.argv,2)

if (parsedArgs.help) {
    console.log("Node-RED v"+RED.version());
    console.log("Usage: node-red [-v] [-?] [--settings settings.js] [--userDir DIR] [flows.json]");
    console.log("");
    console.log("Options:");
    console.log("  -s, --settings FILE  use specified settings file");
    console.log("  -u, --userDir  DIR   use specified user directory");
    console.log("  -v                   enable verbose output");
    console.log("  -?, --help           show usage");
    console.log("");
    console.log("Documentation can be found at http://nodered.org");
    process.exit();
}
if (parsedArgs.argv.remain.length > 0) {
    flowFile = parsedArgs.argv.remain[0];
}

if (parsedArgs.settings) {
    // User-specified settings file
    settingsFile = parsedArgs.settings;
} else if (parsedArgs.userDir && fs.existsSync(path.join(parsedArgs.userDir,"settings.js"))) {
    // User-specified userDir that contains a settings.js
    settingsFile = path.join(parsedArgs.userDir,"settings.js");
} else {
    if (fs.existsSync(path.join(process.env.NODE_RED_HOME,".config.json"))) {
        // NODE_RED_HOME contains user data - use its settings.js
        settingsFile = path.join(process.env.NODE_RED_HOME,"settings.js");
    } else {
        var userSettingsFile = path.join(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,".node-red","settings.js");    
        if (fs.existsSync(userSettingsFile)) {
            // $HOME/.node-red/settings.js exists
            settingsFile = userSettingsFile;
        } else {
            // Use default settings.js
            settingsFile = "./settings";
        }
    }
}

try {
    var settings = require(settingsFile);
    settings.settingsFile = settingsFile;
} catch(err) {
    if (err.code == 'MODULE_NOT_FOUND') {
        console.log("Unable to load settings file: "+settingsFile);
    } else {
        console.log(err);
    }
    process.exit();
}

if (parsedArgs.v) {
    settings.verbose = true;
}

if (settings.https) {
    server = https.createServer(settings.https,function(req,res){app(req,res);});
} else {
    server = http.createServer(function(req,res){app(req,res);});
}
server.setMaxListeners(0);

function formatRoot(root) {
    if (root[0] != "/") {
        root = "/" + root;
    }
    if (root.slice(-1) != "/") {
        root = root + "/";
    }
    return root;
}

if (settings.httpRoot === false) {
    settings.httpAdminRoot = false;
    settings.httpNodeRoot = false;
} else {
    settings.httpRoot = settings.httpRoot||"/";
    settings.disableEditor = settings.disableEditor||false;
}

if (settings.httpAdminRoot !== false) {
    settings.httpAdminRoot = formatRoot(settings.httpAdminRoot || settings.httpRoot || "/");
    settings.httpAdminAuth = settings.httpAdminAuth || settings.httpAuth;
} else {
    settings.disableEditor = true;
}

if (settings.httpNodeRoot !== false) {
    settings.httpNodeRoot = formatRoot(settings.httpNodeRoot || settings.httpRoot || "/");
    settings.httpNodeAuth = settings.httpNodeAuth || settings.httpAuth;
}

settings.uiPort = settings.uiPort||1880;
settings.uiHost = settings.uiHost||"0.0.0.0";

if (flowFile) {
    settings.flowFile = flowFile;
}
if (parsedArgs.userDir) {
    settings.userDir = parsedArgs.userDir;
}

RED.init(server,settings);

if (settings.httpAdminRoot !== false && settings.httpAdminAuth) {
    RED.log.warn("use of httpAdminAuth is deprecated. Use adminAuth instead");
    app.use(settings.httpAdminRoot,
        express.basicAuth(function(user, pass) {
            return user === settings.httpAdminAuth.user && crypto.createHash('md5').update(pass,'utf8').digest('hex') === settings.httpAdminAuth.pass;
        })
    );
}

if (settings.httpNodeRoot !== false && settings.httpNodeAuth) {
    app.use(settings.httpNodeRoot,
        express.basicAuth(function(user, pass) {
            return user === settings.httpNodeAuth.user && crypto.createHash('md5').update(pass,'utf8').digest('hex') === settings.httpNodeAuth.pass;
        })
    );
}
if (settings.httpAdminRoot !== false) {
    app.use(settings.httpAdminRoot,RED.httpAdmin);
}
if (settings.httpNodeRoot !== false) {
    app.use(settings.httpNodeRoot,RED.httpNode);
}

if (settings.httpStatic) {
    settings.httpStaticAuth = settings.httpStaticAuth || settings.httpAuth;
    if (settings.httpStaticAuth) {
        app.use("/",
            express.basicAuth(function(user, pass) {
                return user === settings.httpStaticAuth.user && crypto.createHash('md5').update(pass,'utf8').digest('hex') === settings.httpStaticAuth.pass;
            })
        );
    }
    app.use("/",express.static(settings.httpStatic));
}

function getListenPath() {
    var listenPath = 'http'+(settings.https?'s':'')+'://'+
                    (settings.uiHost == '0.0.0.0'?'127.0.0.1':settings.uiHost)+
                    ':'+settings.uiPort;
    if (settings.httpAdminRoot !== false) {
        listenPath += settings.httpAdminRoot;
    } else if (settings.httpStatic) {
        listenPath += "/";
    }
    return listenPath;
}

RED.start().then(function() {
    if (settings.httpAdminRoot !== false || settings.httpNodeRoot !== false || settings.httpStatic) {
        server.on('error', function(err) {
            if (err.errno === "EADDRINUSE") {
                RED.log.error('Unable to listen on '+getListenPath());
                RED.log.error('Error: port in use');
            } else {
                RED.log.error('Uncaught Exception:');
                if (err.stack) {
                    RED.log.error(err.stack);
                } else {
                    RED.log.error(err);
                }
            }
            process.exit(1);
        });
        server.listen(settings.uiPort,settings.uiHost,function() {
            if (settings.httpAdminRoot === false) {
                RED.log.info('Admin UI disabled');
            }
            process.title = 'node-red';
            RED.log.info('Server now running at '+getListenPath());
        });
    } else {
        util.log('[red] Running in headless mode');
    }
}).otherwise(function(err) {
    RED.log.error("Failed to start server:");
    if (err.stack) {
        RED.log.error(err.stack);
    } else {
        RED.log.error(err);
    }
});


process.on('uncaughtException',function(err) {
    util.log('[red] Uncaught Exception:');
    if (err.stack) {
        util.log(err.stack);
    } else {
        util.log(err);
    }
    process.exit(1);
});

process.on('SIGINT', function () {
    RED.stop();
    // TODO: need to allow nodes to close asynchronously before terminating the
    // process - ie, promises 
    process.exit();
});
