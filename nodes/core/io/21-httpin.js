/**
 * Copyright 2013,2014 IBM Corp.
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

module.exports = function(RED) {
    "use strict";
    var http = require("follow-redirects").http;
    var https = require("follow-redirects").https;
    var urllib = require("url");
    var express = require("express");
    var getBody = require('raw-body');
    var mustache = require("mustache");
    var querystring = require("querystring");

    var cors = require('cors');
    var jsonParser = express.json();
    var urlencParser = express.urlencoded();

    function rawBodyParser(req, res, next) {
        if (req._body) { return next(); }
        req.body = "";
        req._body = true;
        getBody(req, {
            limit: '1mb',
            length: req.headers['content-length'],
            encoding: 'utf8'
        }, function (err, buf) {
            if (err) { return next(err); }
            req.body = buf;
            next();
        });
    }


    function HTTPIn(n) {
        RED.nodes.createNode(this,n);
        if (RED.settings.httpNodeRoot !== false) {

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
                RED.httpNode.delete(this.url,corsHandler,this.callback,this.errorHandler);
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
                    var route = RED.httpNode.route['options'];
                    for (var j = 0; j<route.length; j++) {
                        if (route[j].path == this.url) {
                            route.splice(j,1);
                            //break;
                        }
                    }
                }
            });
        } else {
            this.warn("Cannot create http-in node when httpNodeRoot set to false");
        }
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
                    if (msg.res.get('content-length') == null) {
                        var len;
                        if (msg.payload == null) {
                            len = 0;
                        } else if (typeof msg.payload == "number") {
                            len = Buffer.byteLength(""+msg.payload);
                        } else {
                            len = Buffer.byteLength(msg.payload);
                        }
                        msg.res.set('content-length', len);
                    }
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
        var isTemplatedUrl = (nodeUrl||"").indexOf("{{") != -1;
        var nodeMethod = n.method || "GET";
        var node = this;
        this.on("input",function(msg) {
            node.status({fill:"blue",shape:"dot",text:"requesting"});
            var url;
            if (msg.url) {
                url = msg.url;
            } else if (isTemplatedUrl) {
                url = mustache.render(nodeUrl,msg);
            } else {
                url = nodeUrl;
            }
            // url must start http:// or https:// so assume http:// if not set
            if (!((url.indexOf("http://")===0) || (url.indexOf("https://")===0))) {
                url = "http://"+url;
            }

            var method = (msg.method||nodeMethod).toUpperCase();
            //node.log(method+" : "+url);
            var opts = urllib.parse(url);
            opts.method = method;
            opts.headers = {};
            if (msg.headers) {
                for (var v in msg.headers) {
                    if (msg.headers.hasOwnProperty(v)) {
                        var name = v.toLowerCase();
                        if (name !== "content-type" && name !== "content-length") {
                            // only normalise the known headers used later in this
                            // function. Otherwise leave them alone.
                            name = v;
                        }
                        opts.headers[name] = msg.headers[v];
                    }
                }
            }
            if (this.credentials && this.credentials.user) {
                opts.auth = this.credentials.user+":"+(this.credentials.password||"");
            }
            var payload = null;

            if (msg.payload && (method == "POST" || method == "PUT") ) {
                if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
                    payload = msg.payload;
                } else if (typeof msg.payload == "number") {
                    payload = msg.payload+"";
                } else {
                    if (opts.headers['content-type'] == 'application/x-www-form-urlencoded') {
                        payload = querystring.stringify(msg.payload);
                    } else {
                        payload = JSON.stringify(msg.payload);
                        if (opts.headers['content-type'] == null) {
                            opts.headers['content-type'] = "application/json";
                        }
                    }
                }
                if (opts.headers['content-length'] == null) {
                    opts.headers['content-length'] = Buffer.byteLength(payload);
                }
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
                    node.status({});
                });
            });
            req.on('error',function(err) {
                msg.payload = err.toString() + " : " + url;
                msg.statusCode = err.code;
                node.send(msg);
                node.status({fill:"red",shape:"ring",text:err.code});
            });
            if (payload) {
                req.write(payload);
            }
            req.end();
        });
    }

    RED.nodes.registerType("http request",HTTPRequest,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });
}
