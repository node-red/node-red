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
var http = require('http');
var https = require('https');
var util = require("util");
var express = require("express");
var crypto = require("crypto");
var RED = require("./red/red.js");

var server;
var app = express();

var settingsFile = "./settings";
var flowFile;

for (var argp = 2;argp < process.argv.length;argp+=1) {
    var v = process.argv[argp];
    if (v == "--settings" || v == "-s") {
        if (argp+1 == process.argv.length) {
            console.log("Missing argument to --settings");
            return;
        }
        argp++;
        settingsFile = process.argv[argp];
    } else {
        flowFile = v;
    }
}

var settings = require(settingsFile);

if (settings.https) {
    server = https.createServer(settings.https,function(req,res){app(req,res);});
} else {
    server = http.createServer(function(req,res){app(req,res);});
}

settings.httpRoot = settings.httpRoot||"/";

if (settings.httpRoot[0] != "/") {
    settings.httpRoot = "/"+settings.httpRoot;
}
if (settings.httpRoot.slice(-1) != "/") {
    settings.httpRoot = settings.httpRoot + "/";
}
settings.uiPort = settings.uiPort||1880;
settings.uiHost = settings.uiHost||"0.0.0.0";

if (settings.httpAuth) {
    app.use(settings.httpRoot,
        express.basicAuth(function(user, pass) {
            return user === settings.httpAuth.user && crypto.createHash('md5').update(pass,'utf8').digest('hex') === settings.httpAuth.pass;
        })
    );
}

settings.flowFile = flowFile || settings.flowFile;

var red = RED.init(server,settings);
app.use(settings.httpRoot,red);

if (settings.httpStatic) {
    app.use("/",express.static(settings.httpStatic));
}

RED.start();

var listenPath = 'http'+(settings.https?'s':'')+'://'+
                 (settings.uiHost == '0.0.0.0'?'127.0.0.1':settings.uiHost)+
                 ':'+settings.uiPort+settings.httpRoot;

server.listen(settings.uiPort,settings.uiHost,function() {
	util.log('[red] Server now running at '+listenPath);
});

process.on('uncaughtException',function(err) {
        if (err.errno === "EADDRINUSE") {
            util.log('[red] Unable to listen on '+listenPath);
            util.log('[red] Error: port in use');
        } else {
            util.log('[red] Uncaught Exception:');
            util.log(err.stack);
        }
        process.exit(1);
});

process.on('SIGINT', function () {
    RED.stop();
    // TODO: need to allow nodes to close asynchronously before terminating the
    // process - ie, promises 
    process.exit();
});
