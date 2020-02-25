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

var ws = require("ws");
var when = require("when");
var should = require("should");
var helper = require("node-red-node-test-helper");
var websocketNode = require("nr-test-utils").require("@node-red/nodes/core/network/22-websocket.js");

var sockets = [];

function getWsUrl(path) {
    return helper.url().replace(/http/, "ws") + path;
}

function createClient(listenerid) {
    return when.promise(function(resolve, reject) {
        var node = helper.getNode(listenerid);
        var url = getWsUrl(node.path);
        var sock = new ws(url);
        sockets.push(sock);

        sock.on("open", function() {
            resolve(sock);
        });

        sock.on("error", function(err) {
            reject(err);
        });
    });
}

function closeAll() {
    for (var i = 0; i < sockets.length; i++) {
        sockets[i].close();
    }
    sockets = [];
}

function getSocket(listenerid) {
    var node = helper.getNode(listenerid);
    return node.server;
}

describe('websocket Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        closeAll();
        helper.unload();
    });

    describe('websocket-listener', function() {
        it('should load', function(done) {
            var flow = [{ id: "n1", type: "websocket-listener", path: "/ws" }];
            helper.load(websocketNode, flow, function() {
                helper.getNode("n1").should.have.property("path", "/ws");
                done();
            });
        });

        it('should be server', function(done) {
            var flow = [{ id: "n1", type: "websocket-listener", path: "/ws" }];
            helper.load(websocketNode, flow, function() {
                helper.getNode("n1").should.have.property('isServer', true);
                done();
            });
        });

        it('should handle wholemsg property', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket-listener", path: "/ws2", wholemsg: "true" }];
            helper.load(websocketNode, flow, function() {
                helper.getNode("n1").should.have.property("wholemsg", false);
                helper.getNode("n2").should.have.property("wholemsg", true);
                done();
            });
        });

        it('should create socket', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket in", server: "n1" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    done();
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should close socket on delete', function(done) {
            var flow = [{ id: "n1", type: "websocket-listener", path: "/ws" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.on("close", function(code, msg) {
                        done();
                    });
                    helper.clearFlows();
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should receive data', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket in", server: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    helper.getNode("n3").on("input", function(msg) {
                        msg.should.have.property("payload", "hello");
                        done();
                    });
                    sock.send("hello");
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should receive wholemsg', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws", wholemsg: "true" },
                { id: "n2", type: "websocket in", server: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.send('{"text":"hello"}');
                    helper.getNode("n3").on("input", function(msg) {
                        msg.should.have.property("text", "hello");
                        done();
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should receive wholemsg when data not JSON', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws", wholemsg: "true" },
                { id: "n2", type: "websocket in", server: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.send('hello');
                    helper.getNode("n3").on("input", function(msg) {
                        msg.should.have.property("payload", "hello");
                        done();
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should receive wholemsg when data not object', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws", wholemsg: "true" },
                { id: "n2", type: "websocket in", server: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    helper.getNode("n3").on("input", function(msg) {
                        msg.should.have.property("payload", 123);
                        done();
                    });
                    sock.send(123);
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should send', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "helper", wires: [["n3"]] },
                { id: "n3", type: "websocket out", server: "n1" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.on("message", function(msg, flags) {
                        msg.should.equal("hello");
                        done();
                    });
                    helper.getNode("n2").send({
                        payload: "hello"
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should send wholemsg', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws", wholemsg: "true" },
                { id: "n2", type: "websocket out", server: "n1" },
                { id: "n3", type: "helper", wires: [["n2"]] }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.on("message", function(msg, flags) {
                        JSON.parse(msg).should.have.property("text", "hello");
                        done();
                    });
                    helper.getNode("n3").send({
                        text: "hello"
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should do nothing if no payload', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "helper", wires: [["n3"]] },
                { id: "n3", type: "websocket out", server: "n1" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    setTimeout(function() {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        logEvents.should.have.length(0);
                        done();
                    },100);
                    helper.getNode("n2").send({topic: "hello"});
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should echo', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket in", server: "n1", wires: [["n3"]] },
                { id: "n3", type: "websocket out", server: "n1" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.on("message", function(msg, flags) {
                        msg.should.equal("hello");
                        done();
                    });
                    sock.send("hello");
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should echo wholemsg', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws", wholemsg: "true" },
                { id: "n2", type: "websocket in", server: "n1", wires: [["n3"]] },
                { id: "n3", type: "websocket out", server: "n1" }];
            helper.load(websocketNode, flow, function() {
                createClient("n1").then(function(sock) {
                    sock.on("message", function(msg, flags) {
                        JSON.parse(msg).should.have.property("text", "hello");
                        done();
                    });
                    sock.send('{"text":"hello"}');
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        it('should broadcast', function(done) {
            var flow = [
                { id: "n1", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket out", server: "n1" },
                { id: "n3", type: "helper", wires: [["n2"]] }];
            helper.load(websocketNode, flow, function() {
                var def1 = when.defer(),
                    def2 = when.defer();
                when.all([createClient("n1"), createClient("n1")]).then(function(socks) {
                    socks[0].on("message", function(msg, flags) {
                        msg.should.equal("hello");
                        def1.resolve();
                    });
                    socks[1].on("message", function(msg, flags) {
                        msg.should.equal("hello");
                        def2.resolve();
                    });
                    helper.getNode("n3").send({
                        payload: "hello"
                    });
                    return when.all([def1.promise, def2.promise]).then(function() {
                        done();
                    });
                }).catch(function(err) {
                    done(err);
                });
            });
        });
    });

    describe('websocket-client', function() {
        it('should load', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws") }];
            helper.load(websocketNode, flow, function() {
                helper.getNode("n1").should.have.property('path', getWsUrl("/ws"));
                done();
            });
        });

        it('should not be server', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws") }];
            helper.load(websocketNode, flow, function() {
                helper.getNode("n1").should.have.property('isServer', false);
                done();
            });
        });

        it('should handle wholemsg property', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws") },
                { id: "n2", type: "websocket-client", path: getWsUrl("/ws"), wholemsg: "true" }];
            helper.load(websocketNode, flow, function() {
                helper.getNode("n1").should.have.property("wholemsg", false);
                helper.getNode("n2").should.have.property("wholemsg", true);
                done();
            });
        });

        it('should connect to server', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket-client", path: getWsUrl("/ws") }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    done();
                });

            });
        });

        it('should close on delete', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n2", type: "websocket-client", path: getWsUrl("/ws") }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.on('close', function() {
                        done();
                    });
                    helper.getNode("n2").close();
                });
            });
        });

        it('should receive data', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws") },
                { id: "n2", type: "websocket in", client: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.send('hello');
                });

                helper.getNode("n3").on("input", function(msg) {
                    msg.should.have.property("payload", "hello");
                    done();
                });
            });
        });

        it('should receive wholemsg data ', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws"), wholemsg: "true" },
                { id: "n2", type: "websocket in", client: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.send('{"text":"hello"}');
                });
                helper.getNode("n3").on("input", function(msg) {
                    msg.should.have.property("text", "hello");
                    done();
                });
            });
        });

        it('should receive wholemsg when data not JSON', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws"), wholemsg: "true" },
                { id: "n2", type: "websocket in", client: "n1", wires: [["n3"]] },
                { id: "n3", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.send('hello');
                });
                helper.getNode("n3").on("input", function(msg) {
                    msg.should.have.property("payload", "hello");
                    done();
                });
            });
        });

        it('should send', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws") },
                { id: "n2", type: "websocket out", client: "n1" },
                { id: "n3", type: "helper", wires: [["n2"]] }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.on('message', function(msg) {
                        msg.should.equal("hello");
                        done();
                    });
                });
                getSocket("n1").on("open", function() {
                    helper.getNode("n3").send({
                        payload: "hello"
                    });
                });
            });
        });

        it('should send buffer', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws") },
                { id: "n2", type: "websocket out", client: "n1" },
                { id: "n3", type: "helper", wires: [["n2"]] }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.on('message', function(msg) {
                        Buffer.isBuffer(msg).should.be.true();
                        msg.should.have.length(5);
                        done();
                    });
                });
                getSocket("n1").on("open", function() {
                    helper.getNode("n3").send({
                        payload: Buffer.from("hello")
                    });
                });
            });
        });

        it('should send wholemsg', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws" },
                { id: "n1", type: "websocket-client", path: getWsUrl("/ws"), wholemsg: "true" },
                { id: "n2", type: "websocket out", client: "n1" },
                { id: "n3", type: "helper", wires: [["n2"]] }];
            helper.load(websocketNode, flow, function() {
                getSocket('server').on('connection', function(sock) {
                    sock.on('message', function(msg) {
                        JSON.parse(msg).should.have.property("text", "hello");
                        done();
                    });
                });
                getSocket("n1").on('open', function(){
                    helper.getNode("n3").send({
                        text: "hello"
                    });
                });
            });
        });

        it('should NOT feedback more than once', function(done) {
            var flow = [
                { id: "server", type: "websocket-listener", path: "/ws", wholemsg: "true" },
                { id: "client", type: "websocket-client", path: getWsUrl("/ws"), wholemsg: "true" },
                { id: "n1", type: "websocket in", client: "client", wires: [["n2", "output"]] },
                { id: "n2", type: "websocket out", server: "server" },
                { id: "n3", type: "helper", wires: [["n2"]] },
                { id: "output", type: "helper" }];
            helper.load(websocketNode, flow, function() {
                getSocket('client').on('open', function() {
                    helper.getNode("n3").send({
                        payload: "ping"
                    });
                });
                var acc = 0;
                helper.getNode("output").on("input", function(msg) {
                    acc = acc + 1;
                });
                setTimeout( function() {
                    acc.should.equal(1);
                    helper.clearFlows();
                    done();
                }, 250);
            });
        });
    });

    describe('websocket in node', function() {
        it('should report error if no server config', function(done) {
            var flow = [{ id: "n1", type: "websocket in", mode: "server" }];
            helper.load(websocketNode, flow, function() {
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "websocket in";
                });
                logEvents.should.have.length(1);
                logEvents[0][0].should.have.a.property('msg');
                logEvents[0][0].msg.toString().should.startWith("websocket.errors.missing-conf");
                done();
            });
        });
    });

    describe('websocket out node', function() {
        it('should report error if no server config', function(done) {
            var flow = [{ id: "n1", type: "websocket out", mode: "server" }];
            helper.load(websocketNode, flow, function() {
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "websocket out";
                });
                //console.log(logEvents);
                logEvents.should.have.length(1);
                logEvents[0][0].should.have.a.property('msg');
                logEvents[0][0].msg.toString().should.startWith("websocket.errors.missing-conf");
                done();
            });
        });
    });
});
