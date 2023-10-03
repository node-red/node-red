#!/usr/bin/env node
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

if (process.argv[2] === 'admin') {
    try {
        require("node-red-admin")(process.argv.slice(3)).catch(err => {
            process.exit(1);
        })
    } catch(err) {
        console.log(err)
    }
    return;
}

var http = require('http');
var https = require('https');
var util = require("util");
var express = require("express");
var crypto = require("crypto");
try { bcrypt = require('bcrypt'); }
catch(e) { bcrypt = require('bcryptjs'); }
var nopt = require("nopt");
var path = require("path");
var fs = require("fs-extra");
var RED = require("./lib/red.js");

var server;
var app = express();

var settingsFile;
var flowFile;

var knownOpts = {
    "help": Boolean,
    "port": Number,
    "settings": [path],
    "title": String,
    "userDir": [path],
    "verbose": Boolean,
    "safe": Boolean,
    "define": [String, Array]
};
var shortHands = {
    "?":["--help"],
    "p":["--port"],
    "s":["--settings"],
    // As we want to reserve -t for now, adding a shorthand to help so it
    // doesn't get treated as --title
    "t":["--help"],
    "u":["--userDir"],
    "v":["--verbose"],
    "D":["--define"]
};
nopt.invalidHandler = function(k,v,t) {
    // TODO: console.log(k,v,t);
}

var parsedArgs = nopt(knownOpts,shortHands,process.argv,2)

if (parsedArgs.help) {
    console.log("Node-RED v"+RED.version());
    console.log("Usage: node-red [-v] [-?] [--settings settings.js] [--userDir DIR]");
    console.log("                [--port PORT] [--title TITLE] [--safe] [flows.json]");
    console.log("       node-red admin <command> [args] [-?] [--userDir DIR] [--json]");
    console.log("");
    console.log("Options:");
    console.log("  -p, --port     PORT  port to listen on");
    console.log("  -s, --settings FILE  use specified settings file");
    console.log("      --title    TITLE process window title");
    console.log("  -u, --userDir  DIR   use specified user directory");
    console.log("  -v, --verbose        enable verbose output");
    console.log("      --safe           enable safe mode");
    console.log("  -D, --define   X=Y   overwrite value in settings file");
    console.log("  -?, --help           show this help");
    console.log("  admin <command>      run an admin command");
    console.log("");
    console.log("Documentation can be found at https://nodered.org");
    process.exit();
}

if (parsedArgs.argv.remain.length > 0) {
    flowFile = parsedArgs.argv.remain[0];
}

process.env.NODE_RED_HOME = process.env.NODE_RED_HOME || __dirname;

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
    } else if (process.env.HOMEPATH && fs.existsSync(path.join(process.env.HOMEPATH,".node-red",".config.json"))) {
        // Consider compatibility for older versions
        settingsFile = path.join(process.env.HOMEPATH,".node-red","settings.js");
    } else {
        if (!parsedArgs.userDir && !(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH)) {
            console.log("Could not find user directory. Ensure $HOME is set for the current user, or use --userDir option")
            process.exit(1)
        }
        var userDir = parsedArgs.userDir || path.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH,".node-red");
        var userSettingsFile = path.join(userDir,"settings.js");
        if (fs.existsSync(userSettingsFile)) {
            // $HOME/.node-red/settings.js exists
            settingsFile = userSettingsFile;
        } else {
            var defaultSettings = path.join(__dirname,"settings.js");
            var settingsStat = fs.statSync(defaultSettings);
            if (settingsStat.mtime.getTime() <= settingsStat.ctime.getTime()) {
                // Default settings file has not been modified - safe to copy
                fs.copySync(defaultSettings,userSettingsFile);
                settingsFile = userSettingsFile;
            } else {
                // Use default settings.js as it has been modified
                settingsFile = defaultSettings;
            }
        }
    }
}

try {
    var settings = require(settingsFile);
    settings.settingsFile = settingsFile;
} catch(err) {
    console.log("Error loading settings file: "+settingsFile)
    if (err.code == 'MODULE_NOT_FOUND') {
        if (err.toString().indexOf(settingsFile) === -1) {
            console.log(err.toString());
        }
    } else {
        console.log(err);
    }
    process.exit(1);
}

if (parsedArgs.define) {
    var defs = parsedArgs.define;
    try {
        while (defs.length > 0) {
            var def = defs.shift();
            var match = /^(([^=]+)=(.+)|@(.*))$/.exec(def);
            if (match) {
                if (!match[4]) {
                    var val = match[3];
                    try {
                        val = JSON.parse(match[3]);
                    } catch(err) {
                        // Leave it as a string
                    }
                    RED.util.setObjectProperty(settings, match[2], val, true);
                } else {
                    var obj = fs.readJsonSync(match[4]);
                    for (var k in obj) {
                        if (obj.hasOwnProperty(k)) {
                            RED.util.setObjectProperty(settings, k, obj[k], true)
                        }
                    }
                }
            }
            else {
                throw new Error("Invalid syntax: '"+def+"'");
            }

        }
    } catch (e) {
        console.log("Error processing -D option: "+e.message);
        process.exit(1);
    }
}

if (parsedArgs.verbose) {
    settings.verbose = true;
}
if (parsedArgs.safe || (process.env.NODE_RED_ENABLE_SAFE_MODE && !/^false$/i.test(process.env.NODE_RED_ENABLE_SAFE_MODE) )) {
    settings.safeMode = true;
}
if (process.env.NODE_RED_ENABLE_PROJECTS) {
    settings.editorTheme = settings.editorTheme || {};
    settings.editorTheme.projects = settings.editorTheme.projects || {};
    settings.editorTheme.projects.enabled = !/^false$/i.test(process.env.NODE_RED_ENABLE_PROJECTS);
}

if (process.env.NODE_RED_ENABLE_TOURS) {
    settings.editorTheme = settings.editorTheme || {};
    settings.editorTheme.tours = !/^false$/i.test(process.env.NODE_RED_ENABLE_TOURS);
}


var defaultServerSettings = {
    "x-powered-by": false
}
var serverSettings = Object.assign({},defaultServerSettings,settings.httpServerOptions||{});
for (var eOption in serverSettings) {
    app.set(eOption, serverSettings[eOption]);
}


// Delay logging of (translated) messages until the RED object has been initialized
var delayedLogItems = [];

var startupHttps = settings.https;
if (typeof startupHttps === "function") {
    // Get the result of the function, because createServer doesn't accept functions as input
    startupHttps = startupHttps();
}
var httpsPromise = Promise.resolve(startupHttps);

httpsPromise.then(function(startupHttps) {
    if (startupHttps) {
        server = https.createServer(startupHttps,function(req,res) {app(req,res);});

        if (settings.httpsRefreshInterval) {
            var httpsRefreshInterval = parseFloat(settings.httpsRefreshInterval)||12;
            if (httpsRefreshInterval > 596) {
                // Max value based on (2^31-1)ms - the max that setInterval can accept
                httpsRefreshInterval = 596;
            }
            // Check whether setSecureContext is available (Node.js 11+)
            if (server.setSecureContext) {
                // Check whether `http` is a callable function
                if (typeof settings.https === "function") {
                    delayedLogItems.push({type:"info", id:"server.https.refresh-interval", params:{interval:httpsRefreshInterval}});
                    setInterval(function () {
                        try {
                            // Get the result of the function, because createServer doesn't accept functions as input
                            Promise.resolve(settings.https()).then(function(refreshedHttps) {
                                if (refreshedHttps) {
                                    // The key/cert needs to be updated in the NodeJs http(s) server, when no key/cert is yet available or when the key/cert has changed.
                                    // Note that the refreshed key/cert can be supplied as a string or a buffer.
                                    var updateKey = (server.key == undefined || (Buffer.isBuffer(server.key) && !server.key.equals(refreshedHttps.key)) || (typeof server.key == "string" && server.key != refreshedHttps.key));
                                    var updateCert = (server.cert == undefined || (Buffer.isBuffer(server.cert) && !server.cert.equals(refreshedHttps.cert)) || (typeof server.cert == "string" && server.cert != refreshedHttps.cert));

                                    // Only update the credentials in the server when key or cert has changed
                                    if(updateKey || updateCert) {
                                        server.setSecureContext(refreshedHttps);
                                        RED.log.info(RED.log._("server.https.settings-refreshed"));
                                    }
                                }
                            }).catch(function(err) {
                                RED.log.error(RED.log._("server.https.refresh-failed",{message:err}));
                            });
                        } catch(err) {
                            RED.log.error(RED.log._("server.https.refresh-failed",{message:err}));
                        }
                    }, httpsRefreshInterval*60*60*1000);
                } else {
                    delayedLogItems.push({type:"warn", id:"server.https.function-required"});
                }
            } else {
                delayedLogItems.push({type:"warn", id:"server.https.nodejs-version"});
            }
        }
    } else {
        server = http.createServer(function(req,res) {app(req,res);});
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

    if (settings.httpStatic) {
        settings.httpStaticRoot = formatRoot(settings.httpStaticRoot || "/");
        const statics = Array.isArray(settings.httpStatic) ? settings.httpStatic : [settings.httpStatic];
        const sanitised = [];
        for (let si = 0; si < statics.length; si++) {
            let sp = statics[si];
            if(typeof sp === "string") {
                sp = { path: sp, root: "" }
                sanitised.push(sp);
            } else if (typeof sp === "object" && sp.path ) {
                sanitised.push(sp);
            } else {
                continue;
            }
            sp.subRoot = formatRoot(sp.root || "/");
            sp.root = formatRoot(path.posix.join(settings.httpStaticRoot,sp.subRoot));
        }
        settings.httpStatic = sanitised.length ? sanitised : false;
    }

    // if we got a port from command line, use it (even if 0)
    // replicate (settings.uiPort = parsedArgs.port||settings.uiPort||1880;) but allow zero
    if (parsedArgs.port !== undefined){
        settings.uiPort = parsedArgs.port;
    } else {
        if (settings.uiPort === undefined){
            settings.uiPort = 1880;
        }
    }

    settings.uiHost = settings.uiHost||"0.0.0.0";

    if (flowFile) {
        settings.flowFile = flowFile;
    }
    if (parsedArgs.userDir) {
        settings.userDir = parsedArgs.userDir;
    }

    try {
        RED.init(server,settings);
    } catch(err) {
        if (err.code == "unsupported_version") {
            console.log("Unsupported version of Node.js:",process.version);
            console.log("Node-RED requires Node.js v8.9.0 or later");
        } else {
            console.log("Failed to start server:");
            if (err.stack) {
                console.log(err.stack);
            } else {
                console.log(err);
            }
        }
        process.exit(1);
    }

    function basicAuthMiddleware(user,pass) {
        var basicAuth = require('basic-auth');
        var checkPassword;
        var localCachedPassword;
        if (pass.length == "32") {
            // Assume its a legacy md5 password
            checkPassword = function(p) {
                return crypto.createHash('md5').update(p,'utf8').digest('hex') === pass;
            }
        } else {
            checkPassword = function(p) {
                return bcrypt.compareSync(p,pass);
            }
        }

        var checkPasswordAndCache = function(p) {
            // For BasicAuth routes we know the password cannot change without
            // a restart of Node-RED. This means we can cache the provided crypted
            // version to save recalculating each time.
            if (localCachedPassword === p) {
                return true;
            }
            var result = checkPassword(p);
            if (result) {
                localCachedPassword = p;
            }
            return result;
        }

        return function(req,res,next) {
            if (req.method === 'OPTIONS') {
                return next();
            }
            var requestUser = basicAuth(req);
            if (!requestUser || requestUser.name !== user || !checkPasswordAndCache(requestUser.pass)) {
                res.set('WWW-Authenticate', 'Basic realm="Authorization Required"');
                return res.sendStatus(401);
            }
            next();
        }
    }

    if (settings.httpAdminRoot !== false && settings.httpAdminAuth) {
        RED.log.warn(RED.log._("server.httpadminauth-deprecated"));
        app.use(settings.httpAdminRoot, basicAuthMiddleware(settings.httpAdminAuth.user,settings.httpAdminAuth.pass));
    }

    if (settings.httpAdminRoot !== false) {
        app.use(settings.httpAdminRoot,RED.httpAdmin);
    }
    if (settings.httpNodeRoot !== false && settings.httpNodeAuth) {
        app.use(settings.httpNodeRoot,basicAuthMiddleware(settings.httpNodeAuth.user,settings.httpNodeAuth.pass));
    }
    if (settings.httpNodeRoot !== false) {
        app.use(settings.httpNodeRoot,RED.httpNode);
    }

    if (settings.httpStatic) {
        let appUseMem = {};
        for (let si = 0; si < settings.httpStatic.length; si++) {
            const sp = settings.httpStatic[si];
            const filePath = sp.path;
            const thisRoot = sp.root || "/";
            const options = sp.options;
            const middleware = sp.middleware;
            if(appUseMem[filePath + "::" + thisRoot]) {
                continue;// this path and root already registered!
            }
            appUseMem[filePath + "::" + thisRoot] = true;
            if (settings.httpStaticAuth) {
                app.use(thisRoot, basicAuthMiddleware(settings.httpStaticAuth.user, settings.httpStaticAuth.pass));
            }
            if (middleware) {
                app.use(thisRoot, middleware)
            }
            app.use(thisRoot, express.static(filePath, options));
        }
    }

    function getListenPath() {
        var port = settings.serverPort;
        if (port === undefined){
            port = settings.uiPort;
        }

        var listenPath = 'http'+(settings.https?'s':'')+'://'+
                        (settings.uiHost == '::'?'localhost':(settings.uiHost == '0.0.0.0'?'127.0.0.1':settings.uiHost))+
                        ':'+port;
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
                if (err.code === "EADDRINUSE") {
                    RED.log.error(RED.log._("server.unable-to-listen", {listenpath:getListenPath()}));
                    RED.log.error(RED.log._("server.port-in-use"));
                } else {
                    RED.log.error(RED.log._("server.uncaught-exception"));
                    if (err.stack) {
                        RED.log.error(err.stack);
                    } else {
                        RED.log.error(err);
                    }
                }
                process.exit(1);
            });

            // Log all the delayed messages, since they can be translated at this point
            delayedLogItems.forEach(function (delayedLogItem, index) {
                RED.log[delayedLogItem.type](RED.log._(delayedLogItem.id, delayedLogItem.params||{}));
            });

            server.listen(settings.uiPort,settings.uiHost,function() {
                if (settings.httpAdminRoot === false) {
                    RED.log.info(RED.log._("server.admin-ui-disabled"));
                }
                settings.serverPort = server.address().port;
                process.title = parsedArgs.title || 'node-red';
                RED.log.info(RED.log._("server.now-running", {listenpath:getListenPath()}));
            });
        } else {
            RED.log.info(RED.log._("server.headless-mode"));
        }
    }).catch(function(err) {
        RED.log.error(RED.log._("server.failed-to-start"));
        if (err.stack) {
            RED.log.error(err.stack);
        } else {
            RED.log.error(err);
        }
    });

    process.on('uncaughtException',function(err) {
        util.log('[red] Uncaught Exception:');
        if (err.stack) {
            try {
                RED.log.error(err.stack);
            } catch(err2) {
                util.log(err.stack);
            }
        } else {
            try {
                RED.log.error(err);
            } catch(err2) {
                util.log(err);
            }
        }
        process.exit(1);
    });

    var stopping = false;
    function exitWhenStopped() {
        if (!stopping) {
            stopping = true;
            RED.stop().then(function() {
                process.exit();
            });
        }
    }
    process.on('SIGINT', exitWhenStopped);
    process.on('SIGTERM', exitWhenStopped);
    process.on('SIGHUP', exitWhenStopped);
    process.on('SIGUSR2', exitWhenStopped);  // for nodemon restart
    process.on('SIGBREAK', exitWhenStopped); // for windows ctrl-break
    process.on('message', function(m) {      // for PM2 under window with --shutdown-with-message
        if (m === 'shutdown') { exitWhenStopped() }
    });

}).catch(function(err) {
    console.log("Failed to get https settings: " + err);
    console.log(err.stack)
});
