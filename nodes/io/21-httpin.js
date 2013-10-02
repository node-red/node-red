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

var RED = require("../../red/red");
var util = require("util");
var http = require("http");
var https = require("https");
var urllib = require("url");
var bodyParser = require("express").bodyParser();

function HTTPIn(n) {
	RED.nodes.createNode(this,n);
	this.url = n.url;
	this.method = n.method;

	var node = this;
	this.callback = function(req,res) {
	    console.log(arguments.length);
		node.send({req:req,res:res});
	}
	if (this.method == "get") {
		RED.app.get(this.url,this.callback);
	} else if (this.method == "post") {
		RED.app.post(this.url,bodyParser,this.callback);
	} else if (this.method == "put") {
		RED.app.put(this.url,bodyParser,this.callback);
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
	
	this.on("input",function(msg) {
	        if (msg.res) {
	            if (msg.headers) {
	                res.set(msg.headers);
	            }
	            var statusCode = msg.statusCode || 200;
	            msg.res.send(statusCode,msg.payload);
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
	        opts.method = msg.method||method;
	        if (msg.headers) {
	            opts.header = msg.headers;
	        }
	        var req = httplib.request(opts,function(res) {
	                res.setEncoding('utf8');
	                var message = {
	                    statusCode: res.statusCode,
	                    headers: res.headers,
	                    payload: ""
	                };
	                res.on('data',function(chunk) {
	                        message.payload += chunk;
	                });
	                res.on('end',function() {
	                        node.send(message);
	                });
	        });
	        req.on('error',function(err) {
	                msg.payload = err.toString();
	                msg.statusCode = err.code;
	                node.send(msg);
	        });
	        if (msg.payload) {
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
