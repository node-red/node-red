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
        this.prevReq = null;
        this.throttling = n.throttling;
        this.throttleInterval = n.interval;
        if (RED.settings.httpRequestTimeout) { this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 120000; }
        else { this.reqTimeout = 120000; }

        var prox, noprox;
        if (process.env.http_proxy != null) { prox = process.env.http_proxy; }
        if (process.env.HTTP_PROXY != null) { prox = process.env.HTTP_PROXY; }
        if (process.env.no_proxy != null) { noprox = process.env.no_proxy.split(","); }
        if (process.env.NO_PROXY != null) { noprox = process.env.NO_PROXY.split(","); }
        
        function handleMsg(msg, boundary, preRequestTimestamp, currentStatus) {
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
             msg.payload = Buffer.concat(msg.payload); // bin
             if (node.ret !== "bin") {
                msg.payload = msg.payload.toString('utf8'); // txt
                
                if (node.ret === "obj") {
                    try { msg.payload = JSON.parse(msg.payload); } // obj
                    catch(e) { node.warn(RED._("httpin.errors.json-error")); }
                }
            }
                        
            // In case of multipart streaming, all End-of-line characters should be removed (both from the
            // end and the start).  Otherwise the data will be considered corrupt.  These characters are 
            // remainings from the boundaries and part headers ...
            if (boundary) {
                var begin = 0;
                var end = msg.payload.length - 1;

                // Trim CR or LF characters at the end of the payload
                for (var i = end; i >= begin; i--) {
                    if (msg.payload[i] !== '\n' && msg.payload[i] !== '\r') {
                        break;
                    }
                    end--;
                }
                
                // Trim optional CR or LF characters at the start of the current body
                for (var i = begin; i <= end; i++) {
                    if (msg.payload[i] !== '\n' && msg.payload[i] !== '\r') {
                        break;
                    }
                    begin++;
                }
                
                msg.payload = msg.payload.slice(begin, end);
                
                if (msg.payload.length == 0) {
                    return;
                }
            }
         
            node.send(msg);

            if (!boundary) {
                node.status({}); 
            }  
            else if ((Date.now() - currentStatus.timestamp) > 1000) {
                // For multipart streaming, the node status is inverted every second (to let user know it is still busy processing)
                if (currentStatus.value === "{}") {
                    currentStatus.value = {fill:"blue",shape:"dot",text:"httpin.status.streaming"};
                }
                else {
                    currentStatus.value = "{}";
                }
                node.status(currentStatus.value);
                currentStatus.timestamp = Date.now();
            }
        }

        this.on("input",function(msg) {
            var boundary = "";
            var headerBodySeparator = "";
            var headerSeparator = "";
            var searchString = "";
            var currentStatus = {timestamp:0, value:'{}'}; 
            var preRequestTimestamp = process.hrtime();
            node.status({fill:"blue",shape:"dot",text:"httpin.status.requesting"});
            var url = msg.url || nodeUrl;
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
            if (this.credentials && this.credentials.user) {
                opts.auth = this.credentials.user+":"+(this.credentials.password||"");
            }
            var payload = null;

            if (msg.payload && (method == "POST" || method == "PUT" || method == "PATCH" ) ) {
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
                }
                else { node.warn("Bad proxy url: "+process.env.http_proxy); }
            }
            if (tlsNode) {
                tlsNode.addTLSOptions(opts);
            }
            //var abortStream = msg.hasOwnProperty("abort_stream") && msg.abort_stream == true;
            if (node.prevReq /*|| abortStream*/) {
                // If a previous request is still busy (endless) streaming, then stop it.
                node.prevReq.abort();
            }
            var req = ((/^https/.test(urltotest))?https:http).request(opts,function(res) {  
                var partCurrent = [];
                var partHeader = [];
                var partBody = [];  
                
                // Force NodeJs to return a Buffer (instead of a string)
                // See https://github.com/nodejs/node/issues/6038
                res.setEncoding(null);
                delete res._readableState.decoder;
              
                msg.statusCode = res.statusCode;
                msg.headers = res.headers;
                msg.responseUrl = res.responseUrl;
                msg.payload = [];
 
                // msg.url = url;   // revert when warning above finally removed
                res.on('data',function(chunk) {
                    var searchIndex = -1;
                
                    if (!boundary) {
                        // -----------------------------------------------------------------------------------------
                        // Automatically check whether multipart streaming is required (at the start of the stream)
                        // -----------------------------------------------------------------------------------------
                        var contentType = this.headers['content-type'];
                        
                        if (!/multipart/.test(contentType)) {
                            node.error(RED._("httpin.errors.no-multipart"),msg);
                            return;
                        }
                        
                        // Automatically detect the required boundary (that will be used between parts of the stream)
                        boundary = (contentType.match(/.*;\sboundary=(.*)/) || [null, null])[1];

                        if(!boundary) {
                            node.error(RED._("httpin.errors.no-boundary"),msg);
                            return;
                        }

                        // A boundary needs to start with -- (even if -- is absent in the http header)
                        if (!boundary.startsWith('--')) {
                            boundary = '--' + boundary;
                        }

                        // Every part contains one or more headers and one body (content). 
                        // Headers and body are separated by two EOL (end of line) symbols.
                        // Those EOL symbols can be LF (linefeed \n) or CR (carriage return \r) or CRLF (carriage return linefeed \r\n).
                        // Determine the EOL symbols at the start of the stream.
                        var eolSymbols = (chunk.toString().match(/(?:\r\r|\n\n|\r\n\r\n)/g) || []);
                        
                        if (eolSymbols.indexOf('\r\n\r\n') >= 0) {
                            headerBodySeparator = '\r\n\r\n';
                        }
                        else if (eolSymbols.indexOf('\r\r') >= 0) {
                            headerBodySeparator = '\r\r';
                        }
                        else if (eolSymbols.indexOf('\n\n') >= 0) {
                            headerBodySeparator = '\n\n';
                        }

                        if(!headerBodySeparator) {
                            node.error(RED._("httpin.errors.no-separator"),msg);
                            return;
                        }
                        
                        // The header separator is only one half of the header body separator;
                        headerSeparator = headerBodySeparator.slice(0, headerBodySeparator.length/2);
                        
                        // Store the current request only in case streaming is detected, so it could be aborted afterwards
                        node.prevReq = req; 
                        
                        // The boundary should arrive at the start of the stream, so let's start searching for it
                        searchString = boundary;                      
                    }
                    
                    if (!boundary) {
                        // When no multipart streaming (i.e. request with single response part)
                        msg.payload.push(chunk);
                    }
                    else { 
                        // -----------------------------------------------------------------------------------------
                        // Stream the data in the new chunk
                        // -----------------------------------------------------------------------------------------
                        var checkOverlap = partBody.length > 0;
                        
                        while (true) {   
                            if (searchString == boundary) {
                                partCurrent = partBody;
                            }
                            else {
                                partCurrent = partHeader;
                            }
                                    
                            // When starting with a new chunk and a previous chunk is available, check whether the search string is 
                            // splitted across two chunks.  Indeed data is splitted into chunks by the transport layer, which has 
                            // no knowledge of the protocol being used (so vital data might be splitted).
                            if (checkOverlap == true) {
                                checkOverlap = false;
                                
                                // For a searchString of N characters, create a new buffer containing the last N-1 characters
                                // of the previous chunk and N-1 characters of the current chunk.
                                var previousChunk = partCurrent[partCurrent.length - 1];
                                var previousTrail = previousChunk.slice(previousChunk.length - searchString.length + 1);
                                var currentLead   = chunk.slice(0, searchString.length-1);
                                var chunkOverlap  = Buffer.concat([previousTrail, currentLead]);    
                                
                                searchIndex = chunkOverlap.indexOf(searchString);
                                if (searchIndex >= 0) {
                                    // Cut off the previous body chunk at the position where the search string starts
                                    partCurrent[partCurrent.length - 1] = previousChunk.slice(0, previousChunk.length - searchString.length + searchIndex + 1);
                                    
                                    // Adjust the start of the current chunk
                                    chunk = chunk.slice(searchIndex + 1);
                                }
                            }
                            else {
                                // Try to find the search string in the current chunk
                                searchIndex = chunk.indexOf(searchString);
        
                                if (searchIndex >= 0) {                               
                                    // Store the part of the chunk data preceding the position where the search string starts
                                    partCurrent.push(chunk.slice(0, searchIndex));
                               
                                    // Adjust the start of the current chunk
                                    chunk = chunk.slice(searchIndex + searchString.length);
                                }
                                else {
                                    // Search string not found in this chunk, so store the chunk and proceed to the next chunk
                                    partCurrent.push(chunk);
                                    break;
                                }
                            }      
                               
                            if (searchIndex >= 0) {
                                if (searchString == boundary) {
                                     // Clone the msg (without payload for speed)
                                    var newMsg = RED.util.cloneMessage(msg);

                                    // The part headers will be put in msg.content, with a JSON format like {Content-Type:..., Content-Length:... etc}.
                                    // Note that part headers are optional, even the header "Content-Type" (which defaults to text/plain).
                                    var comma = '';
                                    var quote = '';
                                    var content = '{';
                                    Buffer.concat(partHeader).toString('utf8').trim().split(headerSeparator).forEach(function(entry) {
                                        var entryArray = entry.split(":");
                                        if (entryArray.length == 2) {
                                            isNaN(entryArray[1]) ? quote = '"' : quote = '';
                                            content += comma + '"' + entryArray[0].trim() + '": ' + quote + entryArray[1].trim() + quote;
                                            comma = ', ';
                                        }
                                    });
                                    content += '}';
                                    newMsg.content = JSON.parse(content);
                                                                         
                                    // If a part body has been found, let's put a message on the output port
                                    newMsg.payload = partBody;
                                    handleMsg(newMsg, boundary, preRequestTimestamp,currentStatus);
                                    
                                    // Everything has been send, so start collecting data all over again ...
                                    partHeader = [];
                                    partBody = [];
                                    
                                    // If a (non-zero) throttling interval is specified, the upload should be pauzed during that interval.
                                    // If the message contains a throttling interval, it will override the node's throttling interval.
                                    var throttleInterval = msg.throttle || node.throttleInterval;
                                    if (throttleInterval && throttleInterval !== 0) {
                                        res.pause();
                                        setTimeout(function () {
                                            res.resume();
                                        }, throttleInterval);
                                    }
                                    
                                    // Boundary found, so from here on we will try to find a headerbodyseparator
                                    searchString = headerBodySeparator;                                
                                }
                                else {                               
                                    // HeaderBodySeparator found, so from here on we will try to find a boundary
                                    searchString = boundary;
                                }  
                            }
                        }
                    }
                });
                res.on('end',function() {
                    if(boundary) {
                        // If streaming is interrupted, the last part might not be complete (so skip it)
                        node.status({});
                    }
                    else {
                        handleMsg(msg, boundary, preRequestTimestamp, currentStatus);
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
                node.send(msg);
                node.status({fill:"red",shape:"ring",text:err.code});
            });
            if (payload) {
                req.write(payload);
            }
            req.end();
        });

        this.on("close",function() {
            if (node.prevReq) {
                // At (re)deploy make sure the streaming is closed, otherwise e.g. it keeps sending data across already removed wires
                node.prevReq.abort();
            }
            
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

