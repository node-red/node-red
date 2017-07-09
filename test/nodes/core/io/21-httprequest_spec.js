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
var should = require("should");
var express = require("express");
var bodyParser = require('body-parser');
var helper = require("../../helper.js");
var httpRequestNode = require("../../../../nodes/core/io/21-httprequest.js");
var hashSum = require("hash-sum");

describe('HTTP Request Node', function() {
    var testApp;
    var testServer;
    var testPort = 9000;

    function startServer(done) {
        testPort += 1;
        testServer = http.createServer(testApp);
        testServer.on('error', function(err) {
            startServer(done);
        });
        testServer.listen(testPort,function(err) {
            done();
        })
    }

    function getTestURL(url) {
        return "http://localhost:"+testPort+url;
    }

    before(function(done) {
        testApp = express();
        testApp.use(bodyParser.raw({type:"*/*"}));
        testApp.get('/statusCode204', function(req,res) { res.status(204).end();})
        testApp.get('/text', function(req, res){ res.send('hello'); });
        testApp.get('/json-valid', function(req, res){ res.json({a:1}); });
        testApp.get('/json-invalid', function(req, res){ res.set('Content-Type', 'application/json').send("{a:1"); });
        testApp.post('/postInspect', function(req,res) {
            var result = {
                body: req.body.toString(),
                headers: req.headers
            }
            res.json(result);
        });
        startServer(function() {
            helper.startServer(done);
        });
    });

    after(function() {
        testServer.close();
    });
    afterEach(function() {
        helper.unload();
    });

    it('get plain text content', function(done) {
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
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"foo"});
        });
    });

    it('get JSON content', function(done) {
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

    it('get Buffer content', function(done) {
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

    it('returns plain text when JSON fails to parse', function(done) {
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


    it('return the status code', function(done) {
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

    it('allow the url to be missing the http:// prefix', function(done) {
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

    it('reject non http:// schemes - node config', function(done) {
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
                    done(new Error("non http(s):// scheme allowed through"))
                } else {
                    done();
                }
            },20)
        });
    });

    it('reject non http:// schemes - msg.url', function(done) {
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
                    done(new Error("non http(s):// scheme allowed through"))
                } else {
                    done();
                }
            },20)
        });
    });
    it('allow the message to provide the url', function(done) {
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

    it('allow the message to provide the method', function(done) {
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

    it('allow the url to contain mustache placeholders', function(done) {
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

    it('send the payload as the body of a POST as application/json', function(done) {
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

    it('send a payload of 0 as the body of a POST as text/plain', function(done) {
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

    it('send an Object payload as the body of a POST', function(done) {
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
    })

    it('send a Buffer as the body of a POST', function(done) {
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
            n1.receive({payload:new Buffer('hello'), headers: { 'content-type': 'text/plain'}});
        });
    })

    it('send a Buffer as the body of a POST', function(done) {
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
            n1.receive({payload:new Buffer('hello'), headers: { 'content-type': 'text/plain'}});
        });
    })

    it('ignores unmodified msg.headers property', function(done) {
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
            n1.receive({payload:{foo:"bar"}, headers: { 'content-type': 'text/plain', "x-node-red-request-node":"67690139"}});
        });
    })

    it('uses modified msg.headers property', function(done) {
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
    })

});
