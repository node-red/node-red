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

module.exports = function(RED) {
    "use strict";
    var http = require("follow-redirects").http;
    var https = require("follow-redirects").https;
    var urllib = require("url");
    var mustache = require("mustache");
    var querystring = require("querystring");
    var cookie = require("cookie");
    var hashSum = require("hash-sum");

    function HTTPRequest(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var nodeUrl = n.url;
        var isTemplatedUrl = (nodeUrl||"").indexOf("{{") != -1;
        var nodeMethod = n.method || "GET";
        if (n.tls) {
            var tlsNode = RED.nodes.getNode(n.tls);
        }
        this.ret = n.ret || "txt";
        if (RED.settings.httpRequestTimeout) { this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 120000; }
        else { this.reqTimeout = 120000; }

        var prox, noprox;
        if (process.env.http_proxy != null) { prox = process.env.http_proxy; }
        if (process.env.HTTP_PROXY != null) { prox = process.env.HTTP_PROXY; }
        if (process.env.no_proxy != null) { noprox = process.env.no_proxy.split(","); }
        if (process.env.NO_PROXY != null) { noprox = process.env.NO_PROXY.split(","); }

        this.on("input",function(msg) {
            var preRequestTimestamp = process.hrtime();
            node.status({fill:"blue",shape:"dot",text:"httpin.status.requesting"});
            var url = nodeUrl || msg.url;
            if (msg.url && nodeUrl && (nodeUrl !== msg.url)) {  // revert change below when warning is finally removed
                node.warn(RED._("common.errors.nooverride"));
            }
            if (isTemplatedUrl) {
                url = mustache.render(nodeUrl,msg);
            }
            if (!url) {
                node.error(RED._("httpin.errors.no-url"),msg);
                return;
            }
            // url must start http:// or https:// so assume http:// if not set
            if (url.indexOf("://") !== -1 && url.indexOf("http") !== 0) {
                node.warn(RED._("httpin.errors.invalid-transport"));
                node.status({fill:"red",shape:"ring",text:"httpin.errors.invalid-transport"});
                return;
            }
            if (!((url.indexOf("http://") === 0) || (url.indexOf("https://") === 0))) {
                if (tlsNode) {
                    url = "https://"+url;
                } else {
                    url = "http://"+url;
                }
            }

            var method = nodeMethod.toUpperCase() || "GET";
            if (msg.method && n.method && (n.method !== "use")) {     // warn if override option not set
                node.warn(RED._("common.errors.nooverride"));
            }
            if (msg.method && n.method && (n.method === "use")) {
                method = msg.method.toUpperCase();          // use the msg parameter
            }
            var opts = urllib.parse(url);
            opts.method = method;
            opts.headers = {};
            var ctSet = "Content-Type"; // set default camel case
            var clSet = "Content-Length";
            if (msg.headers) {
                if (msg.headers.hasOwnProperty('x-node-red-request-node')) {
                    var headerHash = msg.headers['x-node-red-request-node'];
                    delete msg.headers['x-node-red-request-node'];
                    var hash = hashSum(msg.headers);
                    if (hash === headerHash) {
                        delete msg.headers;
                    }
                }
                if (msg.headers) {
                    for (var v in msg.headers) {
                        if (msg.headers.hasOwnProperty(v)) {
                            var name = v.toLowerCase();
                            if (name !== "content-type" && name !== "content-length") {
                                // only normalise the known headers used later in this
                                // function. Otherwise leave them alone.
                                name = v;
                            }
                            else if (name === 'content-type') { ctSet = v; }
                            else { clSet = v; }
                            opts.headers[name] = msg.headers[v];
                        }
                    }
                }
            }
            if (msg.cookies) {
                var cookies = [];
                if (opts.headers.hasOwnProperty('cookie')) {
                    cookies.push(opts.headers.cookie);
                }

                for (var name in msg.cookies) {
                    if (msg.cookies.hasOwnProperty(name)) {
                        if (msg.cookies[name] === null || msg.cookies[name].value === null) {
                            // This case clears a cookie for HTTP In/Response nodes.
                            // Ignore for this node.
                        } else if (typeof msg.cookies[name] === 'object') {
                            cookies.push(cookie.serialize(name,msg.cookies[name].value));
                        } else {
                            cookies.push(cookie.serialize(name,msg.cookies[name]));
                        }
                    }
                }
                if (cookies.length > 0) {
                    opts.headers.cookie = cookies.join("; ");
                }
            }
            if (this.credentials && this.credentials.user) {
                opts.auth = this.credentials.user+":"+(this.credentials.password||"");
            }
            var payload = null;

            if (method !== 'GET' && method !== 'HEAD' && typeof msg.payload !== "undefined") {
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
                            opts.headers[ctSet] = "application/json";
                        }
                    }
                }
                if (opts.headers['content-length'] == null) {
                    if (Buffer.isBuffer(payload)) {
                        opts.headers[clSet] = payload.length;
                    } else {
                        opts.headers[clSet] = Buffer.byteLength(payload);
                    }
                }
            }
            // revert to user supplied Capitalisation if needed.
            if (opts.headers.hasOwnProperty('content-type') && (ctSet !== 'content-type')) {
                opts.headers[ctSet] = opts.headers['content-type'];
                delete opts.headers['content-type'];
            }
            if (opts.headers.hasOwnProperty('content-length') && (clSet !== 'content-length')) {
                opts.headers[clSet] = opts.headers['content-length'];
                delete opts.headers['content-length'];
            }
            var urltotest = url;
            var noproxy;
            if (noprox) {
                for (var i in noprox) {
                    if (url.indexOf(noprox[i]) !== -1) { noproxy=true; }
                }
            }
            if (prox && !noproxy) {
                var match = prox.match(/^(http:\/\/)?(.+)?:([0-9]+)?/i);
                if (match) {
                    //opts.protocol = "http:";
                    //opts.host = opts.hostname = match[2];
                    //opts.port = (match[3] != null ? match[3] : 80);
                    opts.headers['Host'] = opts.host;
                    var heads = opts.headers;
                    var path = opts.pathname = opts.href;
                    opts = urllib.parse(prox);
                    opts.path = opts.pathname = path;
                    opts.headers = heads;
                    opts.method = method;
                    urltotest = match[0];
                    if (opts.auth) {
                        opts.headers['Proxy-Authorization'] = "Basic "+new Buffer(opts.auth).toString('Base64')
                    }
                }
                else { node.warn("Bad proxy url: "+process.env.http_proxy); }
            }
            if (tlsNode) {
                tlsNode.addTLSOptions(opts);
            } else {
                if (msg.hasOwnProperty('rejectUnauthorized')) {
                    opts.rejectUnauthorized = msg.rejectUnauthorized;
                }
            }
            var req = ((/^https/.test(urltotest))?https:http).request(opts,function(res) {
                // Force NodeJs to return a Buffer (instead of a string)
                // See https://github.com/nodejs/node/issues/6038
                res.setEncoding(null);
                delete res._readableState.decoder;

                msg.statusCode = res.statusCode;
                msg.headers = res.headers;
                msg.responseUrl = res.responseUrl;
                msg.payload = [];

                if (msg.headers.hasOwnProperty('set-cookie')) {
                    msg.responseCookies = {};
                    msg.headers['set-cookie'].forEach(function(c) {
                        var parsedCookie = cookie.parse(c);
                        var eq_idx = c.indexOf('=');
                        var key = c.substr(0, eq_idx).trim()
                        parsedCookie.value = parsedCookie[key];
                        delete parsedCookie[key];
                        msg.responseCookies[key] = parsedCookie;

                    })

                }
                msg.headers['x-node-red-request-node'] = hashSum(msg.headers);
                // msg.url = url;   // revert when warning above finally removed
                res.on('data',function(chunk) {
                    if (!Buffer.isBuffer(chunk)) {
                        // if the 'setEncoding(null)' fix above stops working in
                        // a new Node.js release, throw a noisy error so we know
                        // about it.
                        throw new Error("HTTP Request data chunk not a Buffer");
                    }
                    msg.payload.push(chunk);
                });
                res.on('end',function() {
                    if (node.metric()) {
                        // Calculate request time
                        var diff = process.hrtime(preRequestTimestamp);
                        var ms = diff[0] * 1e3 + diff[1] * 1e-6;
                        var metricRequestDurationMillis = ms.toFixed(3);
                        node.metric("duration.millis", msg, metricRequestDurationMillis);
                        if (res.client && res.client.bytesRead) {
                            node.metric("size.bytes", msg, res.client.bytesRead);
                        }
                    }

                    // Check that msg.payload is an array - if the req error
                    // handler has been called, it will have been set to a string
                    // and the error already handled - so no further action should
                    // be taken. #1344
                    if (Array.isArray(msg.payload)) {
                        // Convert the payload to the required return type
                        msg.payload = Buffer.concat(msg.payload); // bin
                        if (node.ret !== "bin") {
                            msg.payload = msg.payload.toString('utf8'); // txt

                            if (node.ret === "obj") {
                                try { msg.payload = JSON.parse(msg.payload); } // obj
                                catch(e) { node.warn(RED._("httpin.errors.json-error")); }
                            }
                        }
                        node.status({});
                        node.send(msg);
                    }
                });
            });
            req.setTimeout(node.reqTimeout, function() {
                node.error(RED._("common.notification.errors.no-response"),msg);
                setTimeout(function() {
                    node.status({fill:"red",shape:"ring",text:"common.notification.errors.no-response"});
                },10);
                req.abort();
            });
            req.on('error',function(err) {
                node.error(err,msg);
                msg.payload = err.toString() + " : " + url;
                msg.statusCode = err.code;
                node.status({fill:"red",shape:"ring",text:err.code});
                node.send(msg);
            });
            if (payload) {
                req.write(payload);
            }
            req.end();
        });

        this.on("close",function() {
            node.status({});
        });
    }

    RED.nodes.registerType("http request",HTTPRequest,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });
}
