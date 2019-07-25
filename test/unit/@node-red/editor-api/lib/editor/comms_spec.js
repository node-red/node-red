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

var should = require("should");
var sinon = require("sinon");
const stoppable = require('stoppable');

var when = require("when");
var http = require('http');
var express = require('express');
var app = express();
var WebSocket = require('ws');

var NR_TEST_UTILS = require("nr-test-utils");

var comms = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/comms");
var Users = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/users");
var Tokens = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/tokens");

var address = '127.0.0.1';
var listenPort = 0; // use ephemeral port


describe("api/editor/comms", function() {
    var connections = [];
    var mockComms = {
        addConnection: function(opts) {
            connections.push(opts.client);
            return Promise.resolve()
        },
        removeConnection: function(opts) {
            for (var i=0;i<connections.length;i++) {
                if (connections[i] === opts.client) {
                    connections.splice(i,1);
                    break;
                }
            }
            return Promise.resolve()
        },
        subscribe: function() { return Promise.resolve()},
        unsubscribe: function() { return Promise.resolve(); }
    }

    describe("with default keepalive", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            sinon.stub(Users,"default",function() { return when.resolve(null);});
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });

        after(function(done) {
            Users.default.restore();
            comms.stop();
            server.stop(done);
        });

        it('accepts connection', function(done) {
            var ws = new WebSocket(url);
            connections.length.should.eql(0);
            ws.on('open', function() {
                try {
                    connections.length.should.eql(1);
                    ws.close();
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });

        it('publishes message after subscription', function(done) {
            var ws = new WebSocket(url);
            ws.on('open', function() {
                ws.send('{"subscribe":"topic1"}');
                connections.length.should.eql(1);
                connections[0].send('topic1', 'foo');
            });
            ws.on('message', function(msg) {
                msg.should.equal('[{"topic":"topic1","data":"foo"}]');
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
                connections[0].send('topic3', 'correct');
            });
            ws.on('message', function(msg) {
                console.log(msg);
                msg.should.equal('[{"topic":"topic3","data":"correct"}]');
                ws.close();
                done();
            });
        });
    });

    describe("disabled editor", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            sinon.stub(Users,"default",function() { return Promise.resolve(null);});
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {disableEditor:true}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });

        after(function(done) {
            Users.default.restore();
            comms.stop();
            server.stop(done);
        });

        it('rejects websocket connections',function(done) {
            connections.length.should.eql(0);
            var ws = new WebSocket(url);
            ws.on('open', function() {
                 done(new Error("Socket connection unexpectedly accepted"));
                 ws.close();
            });
            ws.on('error', function() {
                connections.length.should.eql(0);
                done();
            });

        });
    });

    describe("non-default httpAdminRoot set: /adminPath", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            sinon.stub(Users,"default",function() { return when.resolve(null);});
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {httpAdminRoot:"/adminPath"}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/adminPath/comms';
                comms.start();
                done();
            });
        });

        after(function(done) {
            Users.default.restore();
            comms.stop();
            server.stop(done);
        });

        it('accepts connections',function(done) {
            connections.length.should.eql(0);
            var ws = new WebSocket(url);
            ws.on('open', function() {
                connections.length.should.eql(1);
                 ws.close();
                 done();
            });
            ws.on('error', function() {
                done(new Error("Socket connection failed"));
            });

        });
    });

    describe("non-default httpAdminRoot set: /adminPath/", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            sinon.stub(Users,"default",function() { return when.resolve(null);});
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {httpAdminRoot:"/adminPath/"}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/adminPath/comms';
                comms.start();
                done();
            });
        });

        after(function(done) {
            Users.default.restore();
            comms.stop();
            server.stop(done);
        });

        it('accepts connections',function(done) {
            connections.length.should.eql(0);
            var ws = new WebSocket(url);
            ws.on('open', function() {
                connections.length.should.eql(1);
                 ws.close();
                 done();
            });
            ws.on('error', function() {
                done(new Error("Socket connection failed"));
            });

        });
    });

    describe("non-default httpAdminRoot set: adminPath", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            sinon.stub(Users,"default",function() { return when.resolve(null);});
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {httpAdminRoot:"adminPath"}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/adminPath/comms';
                comms.start();
                done();
            });
        });

        after(function(done) {
            Users.default.restore();
            comms.stop();
            server.stop(done);
        });

        it('accepts connections',function(done) {
            connections.length.should.eql(0);
            var ws = new WebSocket(url);
            ws.on('open', function() {
                connections.length.should.eql(1);
                 ws.close();
                 done();
            });
            ws.on('error', function() {
                done(new Error("Socket connection failed"));
            });

        });
    });

    describe("keep alives", function() {
        var server;
        var url;
        var port;
        before(function(done) {
            sinon.stub(Users,"default",function() { return when.resolve(null);});
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {webSocketKeepAliveTime: 100}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        after(function(done) {
            Users.default.restore();
            comms.stop();
            server.stop(done);
        });
        it('are sent', function(done) {
            var ws = new WebSocket(url);
            var count = 0;
            ws.on('message', function(data) {
                var msg = JSON.parse(data)[0];
                msg.should.have.property('topic','hb');
                msg.should.have.property('data').be.a.Number();
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
                    connections[0].send('foo', 'bar');
                }, 50);
            });
            ws.on('message', function(data) {
                var msg = JSON.parse(data)[0];
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
                    return when.resolve({user:"fred",scope:["*"]});
                } else if (token == "5678") {
                    return when.resolve({user:"barney",scope:["*"]});
                } else {
                    return when.resolve(null);
                }
            });


            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {adminAuth:{}}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        after(function(done) {
            getDefaultUser.restore();
            getUser.restore();
            getToken.restore();
            comms.stop();
            server.stop(done);
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
                    connections[0].send('foo', 'correct');
                } else {
                    msg.should.equal('[{"topic":"foo","data":"correct"}]');
                    ws.close();
                }
            });

            ws.on('close', function() {
                try {
                    received.should.equal(2);
                    done();
                } catch(err) {
                    done(err);
                }
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
            server = stoppable(http.createServer(function(req,res){app(req,res)}));
            comms.init(server, {adminAuth:{}}, {comms: mockComms});
            server.listen(listenPort, address);
            server.on('listening', function() {
                port = server.address().port;
                url = 'http://' + address + ':' + port + '/comms';
                comms.start();
                done();
            });
        });
        after(function(done) {
            getDefaultUser.restore();
            comms.stop();
            server.stop(done);
        });

        it('allows anonymous connections that do not authenticate',function(done) {
            var ws = new WebSocket(url);
            var count = 0;
            var interval;
            ws.on('open', function() {
                ws.send('{"subscribe":"foo"}');
                setTimeout(function() {
                    connections[0].send('foo', 'correct');
                },200);
            });
            ws.on('message', function(msg) {
                msg.should.equal('[{"topic":"foo","data":"correct"}]');
                count++;
                ws.close();
            });
            ws.on('close', function() {
                try {
                    count.should.equal(1);
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });


});
