/**
 * Copyright 2014 IBM Corp.
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
var http = require('http');
var express = require('express');
var app = express();
var WebSocket = require('ws');

var comms = require("../../red/comms.js");
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
                msg.should.have.property('topic', 'foo');
                msg.should.have.property('data', 'bar');
                count++;
                if (count == 5) {
                    clearInterval(interval);
                    ws.close();
                    done();
                }
            });
        });
    });

});
