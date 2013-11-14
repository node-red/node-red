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
var http = require("http");
var https = require("https");
var urllib = require("url");
var express = require("express");
var jsonParser = express.json();
var urlencParser = express.urlencoded();

function HTTPIn(n) {
    RED.nodes.createNode(this,n);
    this.url = n.url;
    this.method = n.method;

    var node = this;
    this.callback = function(req,res) {
        if (node.method == "post") { node.send({req:req,res:res,payload:req.body}); }
        else if (node.method == "get") { node.send({req:req,res:res,payload:req.query}); }
        else node.send({req:req,res:res});
    }
    if (this.method == "get") {
        RED.app.get(this.url,this.callback);
    } else if (this.method == "post") {
        RED.app.post(this.url,jsonParser,urlencParser,this.callback);
    } else if (this.method == "put") {
        RED.app.put(this.url,jsonParser,urlencParser,this.callback);
    } else if (this.method == "delete") {
        RED.app.delete(this.url,this.callback);
    }

    this.on("close",function() {
            var routes = RED.app.routes[this.method];
            for (var i in routes) {
                if (routes[i].path == this.url) {
                    routes.splice(i,1);
                    //break;
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
                msg.res.send(statusCode,msg.payload);
            } else {
                node.warn("No response object");
            }
    });
}

RED.nodes.registerType("http response",HTTPOut);

function HTTPRequest(n) {
    RED.nodes.createNode(this,n);
    var url = n.url;
    var method = n.method || "GET";
    var httplib = (/^https/.test(url))?https:http;
    var node = this;
    this.on("input",function(msg) {

            var opts = urllib.parse(msg.url||url);
            opts.method = (msg.method||method).toUpperCase();
            if (msg.headers) {
                opts.headers = msg.headers;
            }
            var req = httplib.request(opts,function(res) {
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
