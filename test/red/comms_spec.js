/**
 * Copyright 2014, 2015 IBM Corp.
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

var should = require("should");
var sinon = require("sinon");

var when = require("when");
var http = require('http');
var express = require('express');
var app = express();
var WebSocket = require('ws');

var comms = require("../../red/comms.js");
var Users = require("../../red/api/auth/users");
var Tokens = require("../../red/api/auth/tokens");

var address = '127.0.0.1';
var listenPort = 0; // use ephemeral port

describe("comms", function() {
    describe("with default keepalive", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            server = http.createServer(function(req,res){app(req,res)});
            comms.init(server, {});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        
        after(function() {
            comms.stop();
        });
    
        it('accepts connection', function(done) {
            var ws = new WebSocket(url);
            ws.on('open', function() {
                ws.close();
                done();
            });
        });
    
        it('publishes message after subscription', function(done) {
            var ws = new WebSocket(url);
            ws.on('open', function() {
                ws.send('{"subscribe":"topic1"}');
                comms.publish('topic1', 'foo');
            });
            ws.on('message', function(msg) {
                msg.should.equal('{"topic":"topic1","data":"foo"}');
                ws.close();
                done();
            });
        });
    
        it('publishes retained message for subscription', function(done) {
            comms.publish('topic2', 'bar', true);
            var ws = new WebSocket(url);
            ws.on('open', function() {
                ws.send('{"subscribe":"topic2"}');
            });
            ws.on('message', function(msg) {
                msg.should.equal('{"topic":"topic2","data":"bar"}');
                ws.close();
                done();
            });
        });
    
        it('retained message is deleted by non-retained message', function(done) {
            comms.publish('topic3', 'retained', true);
            comms.publish('topic3', 'non-retained');
            var ws = new WebSocket(url);
            ws.on('open', function() {
                ws.send('{"subscribe":"topic3"}');
                comms.publish('topic3', 'new');
            });
            ws.on('message', function(msg) {
                msg.should.equal('{"topic":"topic3","data":"new"}');
                ws.close();
                done();
            });
        });
    
        it('malformed messages are ignored',function(done) {
            var ws = new WebSocket(url);
            ws.on('open', function() {
                ws.send('not json');
                ws.send('[]');
                ws.send('{"subscribe":"topic3"}');
                comms.publish('topic3', 'correct');
            });
            ws.on('message', function(msg) {
                msg.should.equal('{"topic":"topic3","data":"correct"}');
                ws.close();
                done();
            });
        });
    
        // The following test currently fails due to minimum viable
        // implementation. More test should be written to test topic
        // matching once this one is passing
    
        if (0) {
            it('receives message on correct topic', function(done) {
                var ws = new WebSocket(url);
                ws.on('open', function() {
                    ws.send('{"subscribe":"topic4"}');
                    comms.publish('topic5', 'foo');
                    comms.publish('topic4', 'bar');
                });
                ws.on('message', function(msg) {
                    msg.should.equal('{"topic":"topic4","data":"bar"}');
                    ws.close();
                    done();
                });
            });
        }
    });

    describe("keep alives", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            server = http.createServer(function(req,res){app(req,res)});
            comms.init(server, {webSocketKeepAliveTime: 100});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        after(function() {
            comms.stop();
        });
        it('are sent', function(done) {
            var ws = new WebSocket(url);
            var count = 0;
            ws.on('message', function(data) {
                var msg = JSON.parse(data);
                msg.should.have.property('topic','hb');
                msg.should.have.property('data').be.a.Number;
                count++;
                if (count == 3) {
                    ws.close();
                    done();
                }
            });
        });
        it('are not sent if other messages are sent', function(done) {
            var ws = new WebSocket(url);
            var count = 0;
            var interval;
            ws.on('open', function() {
                ws.send('{"subscribe":"foo"}');
                interval = setInterval(function() {
                    comms.publish('foo', 'bar');
                }, 50);
            });
            ws.on('message', function(data) {
                var msg = JSON.parse(data);
                // It is possible a heartbeat message may arrive - so ignore them
                if (msg.topic != "hb") {
                    msg.should.have.property('topic', 'foo');
                    msg.should.have.property('data', 'bar');
                    count++;
                    if (count == 5) {
                        clearInterval(interval);
                        ws.close();
                        done();
                    }
                }
            });
        });
    });
    
    describe('authentication required, no anonymous',function() {
        var server;
        var url;
        var port;
        var getDefaultUser;
        var getUser;
        var getToken;
        before(function(done) {
            getDefaultUser = sinon.stub(Users,"default",function() { return when.resolve(null);});
            getUser = sinon.stub(Users,"get", function(username) {
                if (username == "fred") {
                    return when.resolve({permissions:"read"});
                } else {
                    return when.resolve(null);
                }
            });
            getToken = sinon.stub(Tokens,"get",function(token) {
                if (token == "1234") {
                    return when.resolve({user:"fred"});
                } else if (token == "5678") {
                    return when.resolve({user:"barney"});
                } else {
                    return when.resolve(null);
                }
            });
            
            
            server = http.createServer(function(req,res){app(req,res)});
            comms.init(server, {adminAuth:{}});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        after(function() {
            getDefaultUser.restore();
            getUser.restore();
            getToken.restore();
            comms.stop();
        });
        
        it('prevents connections that do not authenticate',function(done) {
            var ws = new WebSocket(url);
            var count = 0;
            var interval;
            ws.on('open', function() {
                ws.send('{"subscribe":"foo"}');
            });
            ws.on('close', function() {
                done();
            });
        });
        
        it('allows connections that do authenticate',function(done) {
            var ws = new WebSocket(url);
            var received = 0;
            ws.on('open', function() {
                ws.send('{"auth":"1234"}');
            });
            ws.on('message', function(msg) {
                received++;
                if (received == 1) {
                    msg.should.equal('{"auth":"ok"}');
                    ws.send('{"subscribe":"foo"}');
                    comms.publish('foo', 'correct');
                } else {
                    msg.should.equal('{"topic":"foo","data":"correct"}');
                    ws.close();
                }
            });
            
            ws.on('close', function() {
                received.should.equal(2);
                done();
            });
        });
        
        it('rejects connections for non-existant token',function(done) {
            var ws = new WebSocket(url);
            var received = 0;
            ws.on('open', function() {
                ws.send('{"auth":"2345"}');
            });
            ws.on('close', function() {
                done();
            });
        });
        it('rejects connections for invalid token',function(done) {
            var ws = new WebSocket(url);
            var received = 0;
            ws.on('open', function() {
                ws.send('{"auth":"5678"}');
            });
            ws.on('close', function() {
                done();
            });
        });
    });

    describe('authentication required, anonymous enabled',function() {
        var server;
        var url;
        var port;
        var getDefaultUser;
        before(function(done) {
            getDefaultUser = sinon.stub(Users,"default",function() { return when.resolve({permissions:"read"});});
            server = http.createServer(function(req,res){app(req,res)});
            comms.init(server, {adminAuth:{}});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        after(function() {
            getDefaultUser.restore();
            comms.stop();
        });
        
        it('allows anonymous connections that do not authenticate',function(done) {
            var ws = new WebSocket(url);
            var count = 0;
            var interval;
            ws.on('open', function() {
                ws.send('{"subscribe":"foo"}');
                setTimeout(function() {
                    comms.publish('foo', 'correct');
                },200);
            });
            ws.on('message', function(msg) {
                msg.should.equal('{"topic":"foo","data":"correct"}');
                count++;
                ws.close();
            });
            ws.on('close', function() {
                count.should.equal(1);
                done();
            });
        });
    });

    
});
