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

var ws = require("ws");
var when = require("when");
var should = require("should");
var helper = require("../../helper.js");
var websocketNode = require("../../../../nodes/core/io/22-websocket.js");

var sockets = [];
function createClient(listenerid) {
    return when.promise(function(resolve, reject) {
        var node = helper.getNode(listenerid);
        var url = helper.url().replace(/http/, "ws") + node.path;
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
    for(var i=0;i<sockets.length;i++) {
        sockets[i].close();
    }
    sockets = [];
}

describe('websocket node', function() {

    before(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function() {
        closeAll();
        helper.unload();
    });

    it('should be loaded, listener', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" }];
        helper.load(websocketNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property("path", "/ws");
            done();
        });
    });

    it('should handle wholemsg property', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" },
        {id:"n2", type:"websocket-listener", wholemsg: "true", path: "/ws2" }];
        helper.load(websocketNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property("wholemsg", false);
            var n2 = helper.getNode("n2");
            n2.should.have.property("wholemsg", true);
            done();
        });
    });

    it('should create socket', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" },
        {id:"n2", server:"n1", type:"websocket in" }];
        helper.load(websocketNode, flow, function() {
            createClient("n1").then(function(sock) {
                done();
            });
        });
    });

    it('should close socket on delete', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" }];
        helper.load(websocketNode, flow, function() {
            createClient("n1").then(function(sock) {
                sock.on("close", function(code, msg) {
                    done();
                });
                helper.clearFlows();
            });
        });
    });

    it('should receive data', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" },
        {id:"n2", server:"n1", type:"websocket in", wires: [["n3"]] },
        {id:"n3", type: "helper"}];
        helper.load(websocketNode, flow, function() {
            var sock = createClient("n1").then(function(sock) {
                var n3 = helper.getNode("n3");
                n3.on("input", function(msg) {
                    msg.should.have.property("payload", "hello");
                    done();
                });
                sock.send("hello");
            });
        });
    });

    it('should receive wholemsg', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", wholemsg: "true", path: "/ws" },
        {id:"n2", server:"n1", type:"websocket in", wires: [["n3"]] },
        {id:"n3", type: "helper"}];
        helper.load(websocketNode, flow, function() {
            var sock = createClient("n1").then(function(sock) {
                sock.send('{"text":"hello"}');
                var n3 = helper.getNode("n3");
                n3.on("input", function(msg) {
                    msg.should.have.property("text", "hello");
                    done();
                });
            });
        });
    });

    it('should send', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" },
        {id:"n2", type:"helper", wires: [["n3"]] },
        {id:"n3", server:"n1", type:"websocket out" }];
        helper.load(websocketNode, flow, function() {
            var sock = createClient("n1").then(function(sock) {
                sock.on("message", function(msg, flags) {
                    msg.should.equal("hello");
                    done();
                });
                var n2 = helper.getNode("n2");
                n2.send({payload: "hello"});
            });
        });
    });

    it('should send wholemsg', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", wholemsg: "true", path: "/ws" },
        {id:"n2", type:"helper", wires: [["n3"]] },
        {id:"n3", server:"n1", type:"websocket out" }];
        helper.load(websocketNode, flow, function() {
            var sock = createClient("n1").then(function(sock) {
                sock.on("message", function(msg, flags) {
                    var jmsg = JSON.parse(msg);
                    jmsg.should.have.property("text", "hello");
                    done();
                });
                var n2 = helper.getNode("n2");
                n2.send({text: "hello"});
            });
        });
    });

    it('should echo', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" },
        {id:"n2", server:"n1", type:"websocket in", wires: [["n3"]] },
        {id:"n3", server:"n1", type:"websocket out" }];
        helper.load(websocketNode, flow, function() {
            var sock = createClient("n1").then(function(sock) {
                sock.on("message", function(msg, flags) {
                    msg.should.equal("hello");
                    done();
                });
                sock.send("hello");
            });
        });
    });

    it('should echo wholemsg', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", wholemsg: "true",  path: "/ws" },
        {id:"n2", server:"n1", type:"websocket in", wires: [["n3"]] },
        {id:"n3", server:"n1", type:"websocket out" }];
        helper.load(websocketNode, flow, function() {
            var sock = createClient("n1").then(function(sock) {
                sock.on("message", function(msg, flags) {
                    var jmsg = JSON.parse(msg);
                    jmsg.should.have.property("text","hello");
                    done();
                });
                sock.send('{"text":"hello"}');
            });
        });
    });

    it('should broadcast', function(done) {
        var flow = [{id:"n1", type:"websocket-listener", path: "/ws" },
        {id:"n2", server:"n1", type:"websocket out" },
        {id:"n3", type: "helper", wires: [["n2"]]}
        ];
        helper.load(websocketNode, flow, function() {
            var def1 = when.defer(), def2 = when.defer();
            when.all([createClient("n1"), createClient("n1")]).then(function(socks){
                socks[0].on("message", function(msg, flags) {
                    msg.should.equal("hello");
                    def1.resolve();
                });
                socks[1].on("message", function(msg, flags) {
                    msg.should.equal("hello");
                    def2.resolve();
                });
                var n3 = helper.getNode("n3");
                n3.send({payload:"hello"});
            });

            when.all([def1.promise, def2.promise]).then(function(){
                done();
            });
        });
    });
});
