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
    var request = require("request");
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
        var paytoqs = n.paytoqs;
        var nodeHTTPPersistent = n["persist"];
        if (n.tls) {
            var tlsNode = RED.nodes.getNode(n.tls);
        }
        this.ret = n.ret || "txt";
        this.authType = n.authType || "basic";
        if (RED.settings.httpRequestTimeout) { this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 120000; }
        else { this.reqTimeout = 120000; }

        var prox, noprox;
        if (process.env.http_proxy) { prox = process.env.http_proxy; }
        if (process.env.HTTP_PROXY) { prox = process.env.HTTP_PROXY; }
        if (process.env.no_proxy) { noprox = process.env.no_proxy.split(","); }
        if (process.env.NO_PROXY) { noprox = process.env.NO_PROXY.split(","); }

        var proxyConfig = null;
        if (n.proxy) {
            proxyConfig = RED.nodes.getNode(n.proxy);
            prox = proxyConfig.url;
            noprox = proxyConfig.noproxy;
        }

        this.on("input",function(msg,nodeSend,nodeDone) {
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
                nodeDone();
                return;
            }
            // url must start http:// or https:// so assume http:// if not set
            if (url.indexOf("://") !== -1 && url.indexOf("http") !== 0) {
                node.warn(RED._("httpin.errors.invalid-transport"));
                node.status({fill:"red",shape:"ring",text:"httpin.errors.invalid-transport"});
                nodeDone();
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

            var isHttps = (/^https/i.test(url));

            var opts = {};
            opts.url = url;
            // set defaultport, else when using HttpsProxyAgent, it's defaultPort of 443 will be used :(.
            opts.defaultPort = isHttps?443:80;
            opts.timeout = node.reqTimeout;
            opts.method = method;
            opts.headers = {};
            opts.encoding = null;  // Force NodeJs to return a Buffer (instead of a string)
            opts.maxRedirects = 21;
            opts.jar = request.jar();
            opts.proxy = null;
            opts.forever = nodeHTTPPersistent;
            if (msg.requestTimeout !== undefined) {
                if (isNaN(msg.requestTimeout)) {
                    node.warn(RED._("httpin.errors.timeout-isnan"));
                } else if (msg.requestTimeout < 1) {
                    node.warn(RED._("httpin.errors.timeout-isnegative"));
                } else {
                    opts.timeout = msg.requestTimeout;
                }
            }
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
            if (msg.hasOwnProperty('followRedirects')) {
                opts.followRedirect = msg.followRedirects;
            }
            var redirectList = [];
            if (!opts.hasOwnProperty('followRedirect') || opts.followRedirect) {
                opts.followRedirect = function(res) {
                    var redirectInfo = {
                        location: res.headers.location,
                    };
                    if (res.headers.hasOwnProperty('set-cookie')) {
                        redirectInfo.cookies = extractCookies(res.headers['set-cookie']);
                    }
                    redirectList.push(redirectInfo);
                    if (this.headers.cookie) {
                        delete this.headers.cookie;
                    }
                    return true;
                };
            }
            if (opts.headers.hasOwnProperty('cookie')) {
                var cookies = cookie.parse(opts.headers.cookie, {decode:String});
                for (var name in cookies) {
                    opts.jar.setCookie(cookie.serialize(name, cookies[name], {encode:String}), url);
                }
                delete opts.headers.cookie;
            }
            if (msg.cookies) {
                for (var name in msg.cookies) {
                    if (msg.cookies.hasOwnProperty(name)) {
                        if (msg.cookies[name] === null || msg.cookies[name].value === null) {
                            // This case clears a cookie for HTTP In/Response nodes.
                            // Ignore for this node.
                        } else if (typeof msg.cookies[name] === 'object') {
                            if(msg.cookies[name].encode === false){
                                // If the encode option is false, the value is not encoded.
                                opts.jar.setCookie(cookie.serialize(name, msg.cookies[name].value, {encode: String}), url);
                            } else {
                                // The value is encoded by encodeURIComponent().
                                opts.jar.setCookie(cookie.serialize(name, msg.cookies[name].value), url);
                            }
                        } else {
                            opts.jar.setCookie(cookie.serialize(name, msg.cookies[name]), url);
                        }
                    }
                }
            }
            if (this.credentials) {
                if (this.authType === "basic") {
                    if (this.credentials.user) {
                        opts.auth = {
                            user: this.credentials.user,
                            pass: this.credentials.password || ""
                        };
                    }
                } else if (this.authType === "digest") {
                    if (this.credentials.user) {
                        // The first request will be sent without auth information.  Based on the 401 response, the library can determine
                        // which auth type is required by the server.  Then the request is resubmitted with the appropriate auth header.
                        opts.auth = {
                            user: this.credentials.user,
                            pass: this.credentials.password || "",
                            sendImmediately: false
                        };
                    }
                } else if (this.authType === "bearer") {
                    opts.auth = {
                        bearer: this.credentials.password || ""
                    };
                }
            }
            var payload = null;

            if (method !== 'GET' && method !== 'HEAD' && typeof msg.payload !== "undefined") {
                if (opts.headers['content-type'] == 'multipart/form-data' && typeof msg.payload === "object") {
                    opts.formData = {};

                    for (var opt in msg.payload) {
                        if (msg.payload.hasOwnProperty(opt)) {
                            var val = msg.payload[opt];
                            if (val !== undefined && val !== null) {
                                if (typeof val === 'string' || Buffer.isBuffer(val)) {
                                    opts.formData[opt] = val;
                                } else if (typeof val === 'object' && val.hasOwnProperty('value')) {
                                    // Treat as file to upload - ensure it has an options object
                                    // as request complains if it doesn't
                                    if (!val.hasOwnProperty('options')) {
                                        val.options = {};
                                    }
                                    opts.formData[opt] = val;
                                } else {
                                    opts.formData[opt] = JSON.stringify(val);
                                }
                            }
                        }
                    }
                } else {
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
                    opts.body = payload;
                }
            }

            if (method == 'GET' && typeof msg.payload !== "undefined" && paytoqs) {
                if (typeof msg.payload === "object") {
                    try {
                        if (opts.url.indexOf("?") !== -1) {
                            opts.url += (opts.url.endsWith("?")?"":"&") + querystring.stringify(msg.payload);
                        } else {
                            opts.url += "?" + querystring.stringify(msg.payload);
                        }
                    } catch(err) {
                        node.error(RED._("httpin.errors.invalid-payload"),msg);
                        nodeDone();
                        return;
                    }
                } else {
                    node.error(RED._("httpin.errors.invalid-payload"),msg);
                    nodeDone();
                    return;
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
            
            var noproxy;
            if (noprox) {
                for (var i = 0; i < noprox.length; i += 1) {
                    if (url.indexOf(noprox[i]) !== -1) { noproxy=true; }
                }
            }
            if (prox && !noproxy) {
                var match = prox.match(/^(http:\/\/)?(.+)?:([0-9]+)?/i);
                if (match) {
                    opts.proxy = prox;
                } else {
                    node.warn("Bad proxy url: "+ prox);
                    opts.proxy = null;
                }
            }
            if (proxyConfig && proxyConfig.credentials && opts.proxy == proxyConfig.url) {
                var proxyUsername = proxyConfig.credentials.username || '';
                var proxyPassword = proxyConfig.credentials.password || '';
                if (proxyUsername || proxyPassword) {
                    opts.headers['proxy-authorization'] =
                        'Basic ' +
                        Buffer.from(proxyUsername + ':' + proxyPassword).toString('base64');
                }
            }
            if (tlsNode) {
                tlsNode.addTLSOptions(opts);
            } else {
                if (msg.hasOwnProperty('rejectUnauthorized')) {
                    opts.rejectUnauthorized = msg.rejectUnauthorized;
                }
            }
            request(opts, function(err, res, body) {
                if(err){
                    if(err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                        node.error(RED._("common.notification.errors.no-response"), msg);
                        node.status({fill:"red", shape:"ring", text:"common.notification.errors.no-response"});
                    }else{
                        node.error(err,msg);
                        node.status({fill:"red", shape:"ring", text:err.code});
                    }
                    msg.payload = err.toString() + " : " + url;
                    msg.statusCode = err.code;
                    nodeSend(msg);
                    nodeDone();
                }else{
                    msg.statusCode = res.statusCode;
                    msg.headers = res.headers;
                    msg.responseUrl = res.request.uri.href;
                    msg.payload = body;
                    msg.redirectList = redirectList;

                    if (msg.headers.hasOwnProperty('set-cookie')) {
                        msg.responseCookies = extractCookies(msg.headers['set-cookie']);
                    }
                    msg.headers['x-node-red-request-node'] = hashSum(msg.headers);
                    // msg.url = url;   // revert when warning above finally removed
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

                    // Convert the payload to the required return type
                    if (node.ret !== "bin") {
                        msg.payload = msg.payload.toString('utf8'); // txt

                        if (node.ret === "obj") {
                            try { msg.payload = JSON.parse(msg.payload); } // obj
                            catch(e) { node.warn(RED._("httpin.errors.json-error")); }
                        }
                    }
                    node.status({});
                    nodeSend(msg);
                    nodeDone();
                }
            });
        });

        this.on("close",function() {
            node.status({});
        });

        function extractCookies(setCookie) {
            var cookies = {};
            setCookie.forEach(function(c) {
                var parsedCookie = cookie.parse(c);
                var eq_idx = c.indexOf('=');
                var key = c.substr(0, eq_idx).trim()
                parsedCookie.value = parsedCookie[key];
                delete parsedCookie[key];
                cookies[key] = parsedCookie;
            });
            return cookies;
        }
    }

    RED.nodes.registerType("http request",HTTPRequest,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });
}
