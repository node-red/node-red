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

var RED = require(process.env.NODE_RED_HOME+"/red/red");
var util = require("util");
var http = require("follow-redirects").http;
var https = require("follow-redirects").https;
var urllib = require("url");
var express = require("express");
var getBody = require('raw-body');
var cors = require('cors');
var jsonParser = express.json();
var urlencParser = express.urlencoded();

function rawBodyParser(req, res, next) {
    if (req._body) return next();
    req.body = "";
    req._body = true;
    getBody(req, {
            limit: '1mb',
            length: req.headers['content-length'],
            encoding: 'utf8'
    }, function (err, buf) {
        if (err) return next(err);
        req.body = buf;
        next();
    });
}


function HTTPIn(n) {
    RED.nodes.createNode(this,n);
    this.url = n.url;
    this.method = n.method;

    var node = this;
    
    this.errorHandler = function(err,req,res,next) {
        node.warn(err);
        res.send(500);
    };
    
    this.callback = function(req,res) {
        if (node.method == "post") {
            node.send({req:req,res:res,payload:req.body});
        } else if (node.method == "get") {
            node.send({req:req,res:res,payload:req.query});
        } else {
            node.send({req:req,res:res});
        }
    }
    
    var corsHandler = function(req,res,next) { next(); }
    
    if (RED.settings.httpNodeCors) {
        corsHandler = cors(RED.settings.httpNodeCors);
        RED.httpNode.options(this.url,corsHandler);
    }
    
    if (this.method == "get") {
        RED.httpNode.get(this.url,corsHandler,this.callback,this.errorHandler);
    } else if (this.method == "post") {
        RED.httpNode.post(this.url,corsHandler,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
    } else if (this.method == "put") {
        RED.httpNode.put(this.url,corsHandler,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
    } else if (this.method == "delete") {
        RED.httpNode.delete(this.url,corsHandler,this.callback,errorHandler);
    }

    this.on("close",function() {
        var routes = RED.httpNode.routes[this.method];
        for (var i = 0; i<routes.length; i++) {
            if (routes[i].path == this.url) {
                routes.splice(i,1);
                //break;
            }
        }
        if (RED.settings.httpNodeCors) {
            var routes = RED.httpNode.routes['options'];
            for (var i = 0; i<routes.length; i++) {
                if (routes[i].path == this.url) {
                    routes.splice(i,1);
                    //break;
                }
            }
        }
    });
}

RED.nodes.registerType("http in",HTTPIn);


function HTTPOut(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    this.on("input",function(msg) {
            if (msg.res) {
                if (msg.headers) {
                    msg.res.set(msg.headers);
                }
                var statusCode = msg.statusCode || 200;
                if (typeof msg.payload == "object" && !Buffer.isBuffer(msg.payload)) {
                    msg.res.jsonp(statusCode,msg.payload);
                } else {
                    msg.res.send(statusCode,msg.payload);
                }
            } else {
                node.warn("No response object");
            }
    });
}

RED.nodes.registerType("http response",HTTPOut);

function HTTPRequest(n) {
    RED.nodes.createNode(this,n);
    var nodeUrl = n.url;
    var nodeMethod = n.method || "GET";
    var node = this;
    var credentials = RED.nodes.getCredentials(n.id);
    if (credentials) {
        this.username = credentials.user;
        this.password = credentials.password;
    }
    this.on("input",function(msg) {
            
            var url = msg.url||nodeUrl;
            var method = (msg.method||nodeMethod).toUpperCase();
            var opts = urllib.parse(url);
            opts.method = method;
            if (msg.headers) {
                opts.headers = msg.headers;
            }
            if (credentials) {
                opts.auth = credentials.user+":"+credentials.password;
            }
            var req = ((/^https/.test(url))?https:http).request(opts,function(res) {
                    res.setEncoding('utf8');
                    msg.statusCode = res.statusCode;
                    msg.headers = res.headers;
                    msg.payload = "";
                    res.on('data',function(chunk) {
                            msg.payload += chunk;
                    });
                    res.on('end',function() {
                            node.send(msg);
                    });
            });
            req.on('error',function(err) {
                    msg.payload = err.toString();
                    msg.statusCode = err.code;
                    node.send(msg);
            });
            if (msg.payload && (method == "POST" || method == "PUT") ) {
                if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
                    req.write(msg.payload);
                } else if (typeof msg.payload == "number") {
                    req.write(msg.payload+"");
                } else {
                    req.write(JSON.stringify(msg.payload));
                }
            }
            req.end();


    });
}

RED.nodes.registerType("http request",HTTPRequest);

var querystring = require('querystring');

RED.httpAdmin.get('/http-request/:id',function(req,res) {
    var credentials = RED.nodes.getCredentials(req.params.id);
    if (credentials) {
        res.send(JSON.stringify({user:credentials.user,hasPassword:(credentials.password&&credentials.password!="")}));
    } else {
        res.send(JSON.stringify({}));
    }
});

RED.httpAdmin.delete('/http-request/:id',function(req,res) {
    RED.nodes.deleteCredentials(req.params.id);
    res.send(200);
});

RED.httpAdmin.post('/http-request/:id',function(req,res) {
    var body = "";
    req.on('data', function(chunk) {
        body+=chunk;
    });
    req.on('end', function(){
        var newCreds = querystring.parse(body);
        var credentials = RED.nodes.getCredentials(req.params.id)||{};
        if (newCreds.user == null || newCreds.user == "") {
            delete credentials.user;
        } else {
            credentials.user = newCreds.user;
        }
        if (newCreds.password == "") {
            delete credentials.password;
        } else {
            credentials.password = newCreds.password||credentials.password;
        }
        RED.nodes.addCredentials(req.params.id,credentials);
        res.send(200);
    });
});


