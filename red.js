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
var settings = require("./settings");

var server;
var app = express();

var redApp = null;

if (settings.https) {
    server = https.createServer(settings.https,function(req,res){app(req,res);});
} else {
    server = http.createServer(function(req,res){app(req,res);});
}

redApp = require('./red/server.js').init(server,settings);

settings.httpRoot = settings.httpRoot||"/";

if (settings.httpRoot[0] != "/") {
    settings.httpRoot = "/"+settings.httpRoot;
}
if (settings.httpRoot.slice(-1) != "/") {
    settings.httpRoot = settings.httpRoot + "/";
}
settings.uiPort = settings.uiPort||1880;

if (settings.httpAuth) {
    app.use(settings.httpRoot,
        express.basicAuth(function(user, pass) {
            return user === settings.httpAuth.user && crypto.createHash('md5').update(pass,'utf8').digest('hex') === settings.httpAuth.pass;
        })
    );
}

app.use(settings.httpRoot,redApp);

    
server.listen(settings.uiPort);
util.log('[red] Server now running at http'+(settings.https?'s':'')+'://127.0.0.1:'+settings.uiPort+settings.httpRoot);

