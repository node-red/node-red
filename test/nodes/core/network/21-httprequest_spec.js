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

var when = require("when");
var http = require("http");
var https = require("https");
var should = require("should");
var express = require("express");
var bodyParser = require('body-parser');
var stoppable = require('stoppable');
var helper = require("node-red-node-test-helper");
var httpRequestNode = require("nr-test-utils").require("@node-red/nodes/core/network/21-httprequest.js");
var tlsNode = require("nr-test-utils").require("@node-red/nodes/core/network/05-tls.js");
var httpProxyNode = require("nr-test-utils").require("@node-red/nodes/core/network/06-httpproxy.js");
var hashSum = require("hash-sum");
var httpProxy = require('http-proxy');
var cookieParser = require('cookie-parser');
var multer = require("multer");
var RED = require("nr-test-utils").require("node-red/lib/red");
var fs = require('fs-extra');
var auth = require('basic-auth');

describe('HTTP Request Node', function() {
    var testApp;
    var testServer;
    var testPort = 10234;
    var testSslServer;
    var testSslPort = 10334;
    var testProxyServer;
    var testProxyPort = 10444;

    //save environment variables
    var preEnvHttpProxyLowerCase;
    var preEnvHttpProxyUpperCase;
    var preEnvNoProxyLowerCase;
    var preEnvNoProxyUpperCase;

    //rediect cookie variables
    var receivedCookies = {};

    function startServer(done) {
        testPort += 1;
        testServer = stoppable(http.createServer(testApp));
        testServer.listen(testPort,function(err) {
            testSslPort += 1;
            var sslOptions = {
                key:  fs.readFileSync('test/resources/ssl/server.key'),
                cert: fs.readFileSync('test/resources/ssl/server.crt')
                /*
                    Country Name (2 letter code) [AU]:
                    State or Province Name (full name) [Some-State]:
                    Locality Name (eg, city) []:
                    Organization Name (eg, company) [Internet Widgits Pty Ltd]:
                    Organizational Unit Name (eg, section) []:
                    Common Name (e.g. server FQDN or YOUR name) []:localhost
                    Email Address []:

                    Please enter the following 'extra' attributes to be sent with your certificate request
                    A challenge password []:
                    An optional company name []:
                */
            };
            testSslServer = stoppable(https.createServer(sslOptions,testApp));
            testSslServer.listen(testSslPort);

            testProxyPort += 1;
            testProxyServer = stoppable(httpProxy.createProxyServer({target:'http://localhost:' + testPort}));
            testProxyServer.on('proxyReq', function(proxyReq, req, res, options) {
                proxyReq.setHeader('x-testproxy-header', 'foobar');
            });
            testProxyServer.on('proxyRes', function (proxyRes, req, res, options) {
                if (req.url == getTestURL('/proxyAuthenticate')){
                    var user = auth.parse(req.headers['proxy-authorization']);
                    if (!(user.name == "foouser" && user.pass == "barpassword")){
                        proxyRes.headers['proxy-authenticate'] = 'BASIC realm="test"';
                        proxyRes.statusCode = 407;
                    }
                }
            });
            testProxyServer.listen(testProxyPort);
            done(err);
        });
    }

    function getTestURL(url) {
        return "http://localhost:"+testPort+url;
    }

    function getSslTestURL(url) {
        return "https://localhost:"+testSslPort+url;
    }

    function getDifferentTestURL(url) {
        return "http://127.0.0.1:"+testPort+url;
    }

    function getSslTestURLWithoutProtocol(url) {
        return "localhost:"+testSslPort+url;
    }

    function deleteProxySetting() {
        delete process.env.http_proxy;
        delete process.env.HTTP_PROXY;
        delete process.env.no_proxy;
        delete process.env.NO_PROXY;
    }

    before(function(done) {

        testApp = express();

        // The fileupload test needs a different set of middleware - so mount
        // as a separate express instance
        var fileUploadApp = express();
        var mp = multer({ storage: multer.memoryStorage() }).any();
        fileUploadApp.post("/file-upload",function(req,res,next) {
            mp(req,res,function(err) {
                req._body = true;
                next(err);
            })
        },bodyParser.json(),function(req,res) {
            res.json({
                body: req.body,
                files: req.files
            })
        });
        testApp.use(fileUploadApp);



        testApp.use(bodyParser.raw({type:"*/*"}));
        testApp.use(cookieParser(undefined,{decode:String}));
        testApp.get('/statusCode204', function(req,res) { res.status(204).end();});
        testApp.get('/text', function(req, res){ res.send('hello'); });
        testApp.get('/redirectToText', function(req, res){ res.status(302).set('Location', getTestURL('/text')).end(); });
        testApp.get('/json-valid', function(req, res){ res.json({a:1}); });
        testApp.get('/json-invalid', function(req, res){ res.set('Content-Type', 'application/json').send("{a:1"); });
        testApp.get('/headersInspect', function(req, res){ res.set('x-test-header', 'bar').send("a"); });
        testApp.get('/timeout', function(req, res){
            setTimeout(function() {
                res.send('hello');
            }, 10000);
        });
        testApp.get('/timeout50ms', function(req, res){
            setTimeout(function() {
                res.send('hello');
            }, 50);
        });
        testApp.get('/checkCookie', function(req, res){
            res.send(req.cookies);
        });
        testApp.get('/setCookie', function(req, res){
            res.cookie('data','hello');
            res.send("");
        });
        testApp.get('/authenticate', function(req, res){
            var user = auth.parse(req.headers['authorization']);
            var result = {
                user: user.name,
                pass: user.pass,
            };
            res.json(result);
        });
        testApp.get('/proxyAuthenticate', function(req, res){
            var user = auth.parse(req.headers['proxy-authorization']);
            var result = {
                user: user.name,
                pass: user.pass,
                headers: req.headers
            };
            res.json(result);
        });
        testApp.post('/postInspect', function(req,res) {
            var result = {
                body: req.body.toString(),
                headers: req.headers
            };
            res.json(result);
        });
        testApp.put('/putInspect', function(req,res) {
            var result = {
                body: req.body.toString(),
                headers: req.headers
            };
            res.json(result);
        });
        testApp.delete('/deleteInspect', function(req,res) { res.status(204).end();});
        testApp.head('/headInspect', function(req,res) { res.status(204).end();});
        testApp.patch('/patchInspect', function(req,res) {
            var result = {
                body: req.body.toString(),
                headers: req.headers
            };
            res.json(result);
        });
        testApp.trace('/traceInspect', function(req,res) {
            var result = {
                body: req.body.toString(),
                headers: req.headers
            };
            res.json(result);
        });
        testApp.options('/*', function(req,res) {
            res.status(200).end();
        });
        testApp.get('/redirectToSameDomain', function(req, res) {
            var key = req.headers.host + req.url;
            receivedCookies[key] = req.cookies;
            res.cookie('redirectToSameDomainCookie','same1');
            res.redirect(getTestURL('/redirectReturn'));
        });
        testApp.get('/redirectToDifferentDomain', function(req, res) {
            var key = req.headers.host + req.url;
            receivedCookies[key] = req.cookies;
            res.cookie('redirectToDifferentDomain','different1');
            res.redirect(getDifferentTestURL('/redirectReturn'));
        });
        testApp.get('/redirectMultipleTimes', function(req, res) {
            var key = req.headers.host + req.url;
            receivedCookies[key] = req.cookies;
            res.cookie('redirectMultipleTimes','multiple1');
            res.redirect(getTestURL('/redirectToDifferentDomain'));
        });
        testApp.get('/redirectReturn', function(req, res) {
            var key = req.headers.host + req.url;
            receivedCookies[key] = req.cookies;
            res.cookie('redirectReturn','return1');
            res.status(200).end();
        });
        testApp.get('/getQueryParams', function(req,res) {
            res.json({
                query:req.query,
                url: req.originalUrl
            });
        })
        startServer(function(err) {
            if (err) {
                done(err);
            }
            helper.startServer(done);
        });
    });

    after(function(done) {
        testServer.stop(() => {
            testProxyServer.stop(() => {
                testSslServer.stop(() => {
                    helper.stopServer(done);
                });
            });
        });
    });

    beforeEach(function() {
        preEnvHttpProxyLowerCase = process.env.http_proxy;
        preEnvHttpProxyUpperCase = process.env.HTTP_PROXY;
        preEnvNoProxyLowerCase = process.env.no_proxy;
        preEnvNoProxyUpperCase = process.env.NO_PROXY;
        process.env.no_proxy = 'localhost';
        process.env.NO_PROXY = 'localhost';
    });

    afterEach(function() {
        process.env.http_proxy = preEnvHttpProxyLowerCase;
        process.env.HTTP_PROXY = preEnvHttpProxyUpperCase;
        // On Windows, if environment variable of NO_PROXY that includes lower cases
        // such as No_Proxy is replaced with NO_PROXY.
        process.env.no_proxy = preEnvNoProxyLowerCase;
        process.env.NO_PROXY = preEnvNoProxyUpperCase;
        if (preEnvHttpProxyLowerCase == undefined) {
            delete process.env.http_proxy;
        }
        if (preEnvHttpProxyUpperCase == undefined) {
            delete process.env.HTTP_PROXY;
        }
        if (preEnvNoProxyLowerCase == undefined) {
            delete process.env.no_proxy;
        }
        if (preEnvNoProxyUpperCase == undefined) {
            delete process.env.NO_PROXY;
        }
        helper.unload();
    });

    describe('request', function() {
        it('should get plain text content', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        msg.redirectList.length.should.equal(0);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should get JSON content', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/json-valid')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload',{a:1});
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type').which.startWith('application/json');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should send the payload as the body of a POST as application/json', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('{"foo":"abcde"}');
                        msg.payload.headers.should.have.property('content-type').which.startWith('application/json');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type').which.startWith('application/json');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:{foo:"abcde"}});
            });
        });

        it('should send a payload of 0 as the body of a POST as text/plain', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('0');
                        msg.payload.headers.should.have.property('content-length','1');
                        msg.payload.headers.should.have.property('content-type').which.startWith('text/plain');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:0, headers: { 'content-type': 'text/plain'}});
            });
        });

        it('should send an Object payload as the body of a POST', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('{"foo":"abcde"}');
                        msg.payload.headers.should.have.property('content-type').which.startWith('text/plain');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type').which.startWith('application/json');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:{foo:"abcde"}, headers: { 'content-type': 'text/plain'}});
            });
        });

        it('should send a Buffer as the body of a POST', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('hello');
                        msg.payload.headers.should.have.property('content-type').which.startWith('text/plain');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type').which.startWith('application/json');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:Buffer.from('hello'), headers: { 'content-type': 'text/plain'}});
            });
        });

        it('should send form-based request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.body.should.equal("foo=1%202%203&bar=");
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('content-type','application/x-www-form-urlencoded');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:{foo:'1 2 3', bar:''}, headers: { 'content-type': 'application/x-www-form-urlencoded'}});
            });
        });

        it('should send PUT request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"PUT",ret:"obj",url:getTestURL('/putInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('foo');
                        msg.payload.headers.should.have.property('content-type').which.startWith('text/plain');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type').which.startWith('application/json');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", headers: { 'content-type': 'text/plain'}});
            });
        });

        it('should send DELETE request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"DELETE",ret:"obj",url:getTestURL('/deleteInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','');
                        msg.should.have.property('statusCode',204);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:{foo:"abcde"}});
            });
        });

        it('should send HEAD request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"use",ret:"txt",url:getTestURL('/headInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','');
                        msg.should.have.property('statusCode',204);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", method:"head"});
            });
        });

        it('should send PATCH request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"PATCH",ret:"obj",url:getTestURL('/patchInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('foo');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('etag');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", headers: { 'content-type': 'text/plain'}});
            });
        });

        it('should send OPTIONS request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"use",ret:"obj",url:getTestURL('/*')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", method:"options"});
            });
        });

        it('should send TRACE request', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"use",ret:"obj",url:getTestURL('/traceInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.body.should.eql('foo');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", method:"trace", headers: { 'content-type': 'text/plain'}});
            });
        });

        it('should get Buffer content', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"bin",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        Buffer.isBuffer(msg.payload).should.be.true();
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should return plain text when JSON fails to parse', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/json-invalid')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload',"{a:1");
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-type').which.startWith('application/json');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should return the status code', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/statusCode204')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','');
                        msg.should.have.property('statusCode',204);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use msg.url', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", url:"/foo"});
            });
        });

        it('should output an error when URL is not provided', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:""},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var inError = false;
                n2.on("input", function(msg) {
                    inError = true;
                });
                n1.receive({payload:"foo"});
                setTimeout(function() {
                    if (inError) {
                        done(new Error("no url allowed though"));
                    } else {
                        done();
                    }
                },20);
            });
        });

        it('should allow the message to provide the url', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt"},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo",url:getTestURL('/text')});
            });
        });

        it('should allow the url to contain mustache placeholders', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/te{{placeholder}}')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo",placeholder:"xt"});
            });
        });

        it('should allow the url to be missing the http:// prefix', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/text').substring("http://".length)},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should reject non http:// schemes - node config', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:"ftp://foo"},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var inError = false;
                n2.on("input", function(msg) {
                    inError = true;
                });
                n1.receive({payload:"foo"});
                setTimeout(function() {
                    if (inError) {
                        done(new Error("non http(s):// scheme allowed through"));
                    } else {
                        done();
                    }
                },20);
            });
        });

        it('should reject non http:// schemes - msg.url', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt"},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var inError = false;
                n2.on("input", function(msg) {
                    inError = true;
                });
                n1.receive({payload:"foo",url:"ftp://foo"});
                setTimeout(function() {
                    if (inError) {
                        done(new Error("non http(s):// scheme allowed through"));
                    } else {
                        done();
                    }
                },20);
            });
        });

        it('should use msg.method', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", method:"POST"});
            });
        });

        it('should allow the message to provide the method', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"use",ret:"txt",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo",method:"get"});
            });
        });

        it('should receive msg.responseUrl', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('responseUrl', getTestURL('/text'));
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should receive msg.responseUrl when redirected', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/redirectToText')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('responseUrl', getTestURL('/text'));
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should prevent following redirect when msg.followRedirects is false', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/redirectToText')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',302);
                        msg.should.have.property('responseUrl', getTestURL('/redirectToText'));
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo",followRedirects:false});
            });
        });

        it('should output an error when request timeout occurred', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/timeout')},
                {id:"n2", type:"helper"}];
            var timeout = RED.settings.httpRequestTimeout;
            RED.settings.httpRequestTimeout = 50;
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode','ESOCKETTIMEDOUT');
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == 'http request';
                        });
                        logEvents.should.have.length(1);
                        var tstmp = logEvents[0][0].timestamp;
                        logEvents[0][0].should.eql({level:helper.log().ERROR, id:'n1',type:'http request',msg:'common.notification.errors.no-response', timestamp:tstmp, path:"global"});
                        done();
                    } catch(err) {
                        done(err);
                    } finally {
                        RED.settings.httpRequestTimeout = timeout;
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should output an error when request timeout occurred when set via msg.requestTimeout', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/timeout')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode','ESOCKETTIMEDOUT');
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == 'http request';
                        });
                        logEvents.should.have.length(1);
                        var tstmp = logEvents[0][0].timestamp;
                        logEvents[0][0].should.eql({level:helper.log().ERROR, id:'n1',type:'http request',msg:'common.notification.errors.no-response', timestamp:tstmp, path:"global"});
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", requestTimeout: 50});
            });
        });
        it('should show a warning if msg.requestTimeout is not a number', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode', 200);
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == 'http request';
                        });
                        logEvents.should.have.length(2);
                        var tstmp = logEvents[0][0].timestamp;
                        logEvents[0][0].should.eql({level:helper.log().WARN, id:'n1',type:'http request',msg:'httpin.errors.timeout-isnan', timestamp:tstmp, path:"global"});
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", requestTimeout: "foo"});
            });
        });
        it('should show a warning if msg.requestTimeout is negative', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode', 200);
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == 'http request';
                        });
                        logEvents.should.have.length(2);
                        var tstmp = logEvents[0][0].timestamp;
                        logEvents[0][0].should.eql({level:helper.log().WARN, id:'n1',type:'http request',msg:'httpin.errors.timeout-isnegative', timestamp:tstmp, path:"global"});
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", requestTimeout: -4});
            });
        });
        it('should show a warning if msg.requestTimeout is set to 0', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode', 200);
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == 'http request';
                        });
                        logEvents.should.have.length(2);
                        var tstmp = logEvents[0][0].timestamp;
                        logEvents[0][0].should.eql({level:helper.log().WARN, id:'n1',type:'http request',msg:'httpin.errors.timeout-isnegative', timestamp:tstmp, path:"global"});
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", requestTimeout: 0});
            });
        });
        it('should pass if response time is faster than timeout set via msg.requestTimeout', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/timeout50ms')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", requestTimeout: 100});
            });
        });


        it('should append query params to url - obj', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",paytoqs:true,ret:"obj",url:getTestURL('/getQueryParams')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload',{
                            query:{a:'1',b:'2',c:'3'},
                            url: '/getQueryParams?a=1&b=2&c=3'
                        });
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:{a:1,b:2,c:3}});
            });
        });
    });

    describe('HTTP header', function() {
        it('should receive cookie', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/setCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.responseCookies.should.have.property('data');
                        msg.responseCookies.data.should.have.property('value','hello');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should send cookie with string', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data','abc');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:'abc'}});
            });
        });

        it('should send multiple cookies with string', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data','abc');
                        msg.payload.should.have.property('foo','bar');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:'abc',foo:'bar'}});
            });
        });

        it('should send cookie with object data', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data','abc');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:{value:'abc'}}});
            });
        });

        it('should send multiple cookies with object data', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data','abc');
                        msg.payload.should.have.property('foo','bar');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:{value:'abc'},foo:{value:'bar'}}});
            });
        });

        it('should encode cookie value', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var value = ';,/?:@ &=+$#';
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data',encodeURIComponent(value));
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:value}});
            });
        });

        it('should encode cookie object', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var value = ';,/?:@ &=+$#';
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data',encodeURIComponent(value));
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:{value:value, encode:true}}});
            });
        });

        it('should not encode cookie when encode option is false', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var value = '!#$%&\'()*+-./:<>?@[]^_`{|}~';
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data',value);
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{data:{value:value, encode:false}}});
            });
        });

        it('should send cookie by msg.headers', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data','abc');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{boo:'123'}, headers:{'cookie':'data=abc'}});
            });
        });

        it('should send multiple cookies by msg.headers', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/checkCookie')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property('data','abc');
                        msg.payload.should.have.property('foo','bar');
                        msg.should.have.property('statusCode',200);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", cookies:{boo:'123'}, headers:{'cookie':'data=abc; foo=bar;'}});
            });
        });

        it('should convert all HTTP headers into lower case', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('content-type').which.startWith('text/plain');
                        msg.payload.headers.should.have.property('content-length', "3");
                        msg.payload.headers.should.have.property('if-modified-since','Sun, 01 Jun 2000 00:00:00 GMT');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", headers: { 'Content-Type':'text/plain', 'Content-Length': "3", 'If-Modified-Since':'Sun, 01 Jun 2000 00:00:00 GMT'}});
            });
        });

        it('should receive HTTP header', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getTestURL('/headersInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.headers.should.have.property('x-test-header','bar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should ignore unmodified x-node-red-request-node header', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.headers.should.have.property('content-type').which.startWith('application/json');
                        msg.payload.headers.should.not.have.property('x-node-red-request-node');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                // Pass in a headers property with an unmodified x-node-red-request-node hash
                // This should cause the node to ignore the headers

                var headers = { 'content-type': 'text/plain' };
                headers['x-node-red-request-node'] = require("hash-sum")(headers);

                n1.receive({payload:{foo:"bar"}, headers: headers});
            });
        });

        it('should use modified msg.headers property', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.headers.should.have.property('content-type').which.startWith('text/plain');
                        msg.payload.headers.should.not.have.property('x-node-red-request-node');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                // Pass in a headers property with a x-node-red-request-node hash that doesn't match the contents
                // This should cause the node to use the headers
                n1.receive({payload:{foo:"bar"}, headers: { 'content-type': 'text/plain', "x-node-red-request-node":"INVALID_SUM"}});
            });
        });
    });

    describe('protocol', function() {
        it('should use msg.rejectUnauthorized', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getSslTestURL('/text')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n2 = helper.getNode("n2");
                var n1 = helper.getNode("n1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        msg.should.have.property('responseUrl').which.startWith('https://');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo", rejectUnauthorized: false});
            });
        });

        it('should use tls-config', function(done) {
            var flow = [
                {id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"txt",url:getSslTestURLWithoutProtocol('/text'),tls:"n3"},
                {id:"n2", type:"helper"},
                {id:"n3", type:"tls-config", cert:"test/resources/ssl/server.crt", key:"test/resources/ssl/server.key", ca:"", verifyservercert:false}];
            var testNodes = [httpRequestNode, tlsNode];
            helper.load(testNodes, flow, function() {
                var n3 = helper.getNode("n3");
                var n2 = helper.getNode("n2");
                var n1 = helper.getNode("n1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload','hello');
                        msg.should.have.property('statusCode',200);
                        msg.should.have.property('headers');
                        msg.headers.should.have.property('content-length',''+('hello'.length));
                        msg.headers.should.have.property('content-type').which.startWith('text/html');
                        msg.should.have.property('responseUrl').which.startWith('https://');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use http_proxy', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.http_proxy = "http://localhost:" + testProxyPort;
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use http_proxy when environment variable is invalid', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.http_proxy = "invalidvalue";
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.not.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use HTTP_PROXY', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.HTTP_PROXY = "http://localhost:" + testProxyPort;
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use no_proxy', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.http_proxy = "http://localhost:" + testProxyPort;
            process.env.no_proxy = "foo,localhost";
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.headers.should.not.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use NO_PROXY', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.HTTP_PROXY = "http://localhost:" + testProxyPort;
            process.env.NO_PROXY = "foo,localhost";
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.headers.should.not.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use http-proxy-config', function(done) {
            var flow = [
                {id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect'),proxy:"n3"},
                {id:"n2",type:"helper"},
                {id:"n3",type:"http proxy",url:"http://localhost:" + testProxyPort}
            ];
            var testNode = [ httpRequestNode, httpProxyNode ];
            deleteProxySetting();
            helper.load(testNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should not use http-proxy-config when invalid url is specified', function(done) {
            var flow = [
                {id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect'),proxy:"n3"},
                {id:"n2", type:"helper"},
                {id:"n3",type:"http proxy",url:"invalidvalue"}
            ];
            var testNode = [ httpRequestNode, httpProxyNode ];
            deleteProxySetting();
            helper.load(testNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.not.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should use http-proxy-config when valid noproxy is specified', function(done) {
            var flow = [
                {id:"n1",type:"http request",wires:[["n2"]],method:"POST",ret:"obj",url:getTestURL('/postInspect'),proxy:"n3"},
                {id:"n2", type:"helper"},
                {id:"n3",type:"http proxy",url:"http://localhost:" + testProxyPort,noproxy:["foo","localhost"]}
            ];
            var testNode = [ httpRequestNode, httpProxyNode ];
            deleteProxySetting();
            helper.load(testNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.headers.should.not.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });
    });

    describe('authentication', function() {
        it('should authenticate on server', function(done) {
            var flow = [{id:"n1",type:"http request",wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/authenticate')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.credentials = {user:'userfoo', password:'passwordfoo'};
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('user', 'userfoo');
                        msg.payload.should.have.property('pass', 'passwordfoo');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should authenticate on proxy server', function(done) {
            var flow = [{id:"n1",type:"http request", wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/proxyAuthenticate')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.http_proxy = "http://foouser:barpassword@localhost:" + testProxyPort;
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('user', 'foouser');
                        msg.payload.should.have.property('pass', 'barpassword');
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should output an error when proxy authentication was failed', function(done) {
            var flow = [{id:"n1",type:"http request", wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/proxyAuthenticate')},
                {id:"n2", type:"helper"}];
            deleteProxySetting();
            process.env.http_proxy = "http://xxxuser:barpassword@localhost:" + testProxyPort;
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',407);
                        msg.headers.should.have.property('proxy-authenticate', 'BASIC realm="test"');
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should authenticate on proxy server(http-proxy-config)', function(done) {
            var flow = [
                {id:"n1",type:"http request", wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/proxyAuthenticate'),proxy:"n3"},
                {id:"n2", type:"helper"},
                {id:"n3",type:"http proxy",url:"http://localhost:" + testProxyPort}
            ];
            var testNode = [ httpRequestNode, httpProxyNode ];
            deleteProxySetting();
            helper.load(testNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                n3.credentials = {username:'foouser', password:'barpassword'};
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',200);
                        msg.payload.should.have.property('user', 'foouser');
                        msg.payload.should.have.property('pass', 'barpassword');
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });

        it('should output an error when proxy authentication was failed(http-proxy-config)', function(done) {
            var flow = [
                {id:"n1",type:"http request", wires:[["n2"]],method:"GET",ret:"obj",url:getTestURL('/proxyAuthenticate'),proxy:"n3"},
                {id:"n2", type:"helper"},
                {id:"n3",type:"http proxy",url:"http://@localhost:" + testProxyPort}
            ];
            var testNode = [ httpRequestNode, httpProxyNode ];
            deleteProxySetting();
            helper.load(testNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                n3.credentials = {username:'xxxuser', password:'barpassword'};
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('statusCode',407);
                        msg.headers.should.have.property('proxy-authenticate', 'BASIC realm="test"');
                        msg.payload.should.have.property('headers');
                        msg.payload.headers.should.have.property('x-testproxy-header','foobar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo"});
            });
        });
    });

    describe('file-upload', function() {
        it('should upload a file', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'POST',ret:'obj',url:getTestURL('/file-upload')},
                {id:"n2", type:"helper"}];
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.payload.should.have.property("body",{"other":"123"});
                        msg.payload.should.have.property("files");
                        msg.payload.files.should.have.length(1);
                        msg.payload.files[0].should.have.property('fieldname','file');
                        msg.payload.files[0].should.have.property('originalname','file.txt');
                        msg.payload.files[0].should.have.property('buffer',{"type":"Buffer","data":[72,101,108,108,111,32,87,111,114,108,100]});
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({
                    headers: {
                        'content-type':'multipart/form-data'
                    },
                    payload: {
                        file: {
                            value: Buffer.from("Hello World"),
                            options: {
                                filename: "file.txt"
                            }
                        },
                        other: 123
                    }
                });
            });
        })
    })

    describe('redirect-cookie', function() {
        it('should send cookies to the same domain when redirected(no cookies)', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectToSameDomain')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var cookies1 = receivedCookies['localhost:'+testPort+'/redirectToSameDomain'];
                    var cookies2 = receivedCookies['localhost:'+testPort+'/redirectReturn'];
                    if (cookies1 && Object.keys(cookies1).length != 0) {
                        done(new Error('Invalid cookie(path:/rediectToSame)'));
                        return;
                    }
                    if ((cookies2 && Object.keys(cookies2).length != 1) ||
                        cookies2['redirectToSameDomainCookie'] !== 'same1') {
                        done(new Error('Invalid cookie(path:/rediectReurn)'));
                       return;
                    }
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://localhost:'+testPort+'/redirectReturn');
                    redirect1.cookies.redirectToSameDomainCookie.Path.should.equal('/');
                    redirect1.cookies.redirectToSameDomainCookie.value.should.equal('same1');
                    done();
                });
                n1.receive({});
            });
        });
        it('should not send cookies to the different domain when redirected(no cookies)', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectToDifferentDomain')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var cookies1 = receivedCookies['localhost:'+testPort+'/redirectToSameDomain'];
                    var cookies2 = receivedCookies['127.0.0.1:'+testPort+'/redirectReturn'];
                    if (cookies1 && Object.keys(cookies1).length != 0) {
                        done(new Error('Invalid cookie(path:/rediectToDiffer)'));
                        return;
                    }
                    if (cookies2 && Object.keys(cookies2).length != 0) {
                        done(new Error('Invalid cookie(path:/rediectReurn)'));
                        return;
                    }
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://127.0.0.1:'+testPort+'/redirectReturn');
                    redirect1.cookies.redirectToDifferentDomain.Path.should.equal('/');
                    redirect1.cookies.redirectToDifferentDomain.value.should.equal('different1');
                    done();
                });
                n1.receive({});
            });
        });
        it('should send cookies to the same domain when redirected(msg.cookies)', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectToSameDomain')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var cookies1 = receivedCookies['localhost:'+testPort+'/redirectToSameDomain'];
                    var cookies2 = receivedCookies['localhost:'+testPort+'/redirectReturn'];
                    if ((cookies1 && Object.keys(cookies1).length != 1) ||
                        cookies1['requestCookie'] !== 'request1') {
                        done(new Error('Invalid cookie(path:/rediectToSame)'));
                        return;
                    }
                    if ((cookies2 && Object.keys(cookies2).length != 2) ||
                         cookies1['requestCookie'] !== 'request1' ||
                         cookies2['redirectToSameDomainCookie'] !== 'same1') {
                        done(new Error('Invalid cookie(path:/rediectReurn)'));
                        return;
                    }
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://localhost:'+testPort+'/redirectReturn');
                    redirect1.cookies.redirectToSameDomainCookie.Path.should.equal('/');
                    redirect1.cookies.redirectToSameDomainCookie.value.should.equal('same1');
                    done();
                });
                n1.receive({
                    cookies: { requestCookie: 'request1' }
                });
            });
        });
        it('should not send cookies to the different domain when redirected(msg.cookies)', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectToDifferentDomain')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var cookies1 = receivedCookies['localhost:'+testPort+'/redirectToDifferentDomain'];
                    var cookies2 = receivedCookies['127.0.0.1:'+testPort+'/redirectReturn'];
                    if ((cookies1 && Object.keys(cookies1).length != 1) ||
                        cookies1['requestCookie'] !== 'request1') {
                        done(new Error('Invalid cookie(path:/rediectToDiffer)'));
                        return;
                    }
                    if (cookies2 && Object.keys(cookies2).length != 0) {
                        done(new Error('Invalid cookie(path:/rediectReurn)'));
                        return;
                    }
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://127.0.0.1:'+testPort+'/redirectReturn');
                    redirect1.cookies.redirectToDifferentDomain.Path.should.equal('/');
                    redirect1.cookies.redirectToDifferentDomain.value.should.equal('different1');
                    done();
                });
                n1.receive({
                    cookies: { requestCookie: 'request1' }
                });
            });
        });
        it('should send cookies to the same domain when redirected(msg.headers.cookie)', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectToSameDomain')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var cookies1 = receivedCookies['localhost:'+testPort+'/redirectToSameDomain'];
                    var cookies2 = receivedCookies['localhost:'+testPort+'/redirectReturn'];
                    if ((cookies1 && Object.keys(cookies1).length != 1) ||
                        cookies1['requestCookie'] !== 'request1') {
                        done(new Error('Invalid cookie(path:/rediectToSame)'));
                        return;
                    }
                    if ((cookies2 && Object.keys(cookies2).length != 2) ||
                        cookies1['requestCookie'] !== 'request1' ||
                        cookies2['redirectToSameDomainCookie'] !== 'same1') {
                        done(new Error('Invalid cookie(path:/rediectReurn)'));
                        return;
                    }
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://localhost:'+testPort+'/redirectReturn');
                    redirect1.cookies.redirectToSameDomainCookie.Path.should.equal('/');
                    redirect1.cookies.redirectToSameDomainCookie.value.should.equal('same1');
                    done();
                });
                n1.receive({
                    headers: { cookie: 'requestCookie=request1' }
                });
            });
        });
        it('should not send cookies to the different domain when redirected(msg.headers.cookie)', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectToDifferentDomain')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var cookies1 = receivedCookies['localhost:'+testPort+'/redirectToDifferentDomain'];
                    var cookies2 = receivedCookies['127.0.0.1:'+testPort+'/redirectReturn'];
                    if ((cookies1 && Object.keys(cookies1).length != 1) ||
                        cookies1['requestCookie'] !== 'request1') {
                        done(new Error('Invalid cookie(path:/rediectToDiffer)'));
                        return;
                    }
                    if (cookies2 && Object.keys(cookies2).length != 0) {
                        done(new Error('Invalid cookie(path:/rediectReurn)'));
                        return;
                    }
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://127.0.0.1:'+testPort+'/redirectReturn');
                    redirect1.cookies.redirectToDifferentDomain.Path.should.equal('/');
                    redirect1.cookies.redirectToDifferentDomain.value.should.equal('different1');
                    done();
                });
                n1.receive({
                    headers: { cookie: 'requestCookie=request1' }
                });
            });
        });
        it('should return all redirect information when redirected multiple times', function(done) {
            var flow = [{id:'n1',type:'http request',wires:[['n2']],method:'GET',ret:'obj',url:getTestURL('/redirectMultipleTimes')},
                {id:"n2", type:"helper"}];
            receivedCookies = {};
            helper.load(httpRequestNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    var redirect1 = msg.redirectList[0];
                    redirect1.location.should.equal('http://localhost:'+testPort+'/redirectToDifferentDomain');
                    redirect1.cookies.redirectMultipleTimes.Path.should.equal('/');
                    redirect1.cookies.redirectMultipleTimes.value.should.equal('multiple1');
                    var redirect2 = msg.redirectList[1];
                    redirect2.location.should.equal('http://127.0.0.1:'+testPort+'/redirectReturn');
                    redirect2.cookies.redirectToDifferentDomain.Path.should.equal('/');
                    redirect2.cookies.redirectToDifferentDomain.value.should.equal('different1');
                    done();
                });
                n1.receive({
                    headers: { cookie: 'requestCookie=request1' }
                });
            });
        });
    });
});
