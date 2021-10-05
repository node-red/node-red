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
var linkNode = require("nr-test-utils").require("@node-red/nodes/core/common/60-link.js");
var helper = require("node-red-node-test-helper");

describe('link Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded (link in)', function(done) {
        var flow = [{id:"n1", type:"link in", name: "link-in" }];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'link-in');
            done();
        });
    });

    it('should be loaded (link out)', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out" }];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'link-out');
            done();
        });
    });

    it('should be linked', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out", links:["n2"]},
                    {id:"n2", type:"link in", name: "link-in", wires:[["n3"]]},
                    {id:"n3", type:"helper"}];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                try {
                    msg.should.have.property('payload', 'hello');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"hello"});
        });
    });

    it('should be linked to multiple nodes', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out", links:["n2", "n3"]},
                    {id:"n2", type:"link in", name: "link-in0", wires:[["n4"]]},
                    {id:"n3", type:"link in", name: "link-in1", wires:[["n4"]]},
                    {id:"n4", type:"helper"} ];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n4 = helper.getNode("n4");
            var count = 0;
            n4.on("input", function (msg) {
                try {
                    msg.should.have.property('payload', 'hello');
                    count++;
                    if(count == 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"hello"});
        });
    });

    it('should be linked from multiple nodes', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out0", links:["n3"]},
                    {id:"n2", type:"link out", name: "link-out1", links:["n3"]},
                    {id:"n3", type:"link in", name: "link-in", wires:[["n4"]]},
                    {id:"n4", type:"helper"} ];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n4 = helper.getNode("n4");
            var count = 0;
            n4.on("input", function(msg) {
                try {
                    msg.should.have.property('payload', 'hello');
                    count++;
                    if(count == 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"hello"});
            n2.receive({payload:"hello"});
        });
    });

    describe("link-call node", function() {
        it('should call link-in node and get response', function(done) {
            var flow = [{id:"link-in-1", type:"link in", wires: [[ "func"]]},
                        {id:"func", type:"helper", wires: [["link-out-1"]]},
                        {id:"link-out-1", type:"link out", mode: "return"},
                        {id:"link-call", type:"link call", links:["link-in-1"], wires:[["n4"]]},
                        {id:"n4", type:"helper"} ];
            helper.load(linkNode, flow, function() {
                var func = helper.getNode("func");
                func.on("input", function(msg, send, done) {
                    msg.payload = "123";
                    send(msg);
                    done();
                })
                var n1 = helper.getNode("link-call");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '123');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"hello"});
            });
        })
    });

    it('should allow nested link-call flows', function(done) {
        var flow = [/** Multiply by 2 link flow **/
                    {id:"li1", type:"link in", wires: [[ "m2"]]},
                    {id:"m2", type:"helper", wires: [["lo1"]]},
                    {id:"lo1", type:"link out", mode: "return"},
                    /** Multiply by 3 link flow **/
                    {id:"li2", type:"link in", wires: [[ "m3"]]},
                    {id:"m3", type:"helper", wires: [["lo2"]]},
                    {id:"lo2", type:"link out", mode: "return"},
                    /** Multiply by 6 link flow **/
                    {id:"li3", type:"link in", wires: [[ "link-call-1"]]},
                    {id:"link-call-1", type:"link call", links:["m2"], wires:[["link-call-2"]]},
                    {id:"link-call-2", type:"link call", links:["m3"], wires:[["lo3"]]},
                    {id:"lo3", type:"link out", mode: "return"},
                    /** Test Flow Entry **/
                    {id:"link-call", type:"link call", links:["li3"], wires:[["n4"]]},
                    {id:"n4", type:"helper"} ];
        helper.load(linkNode, flow, function() {
            var m2 = helper.getNode("m2");
            m2.on("input", function(msg, send, done) { msg.payload *= 2 ; send(msg); done(); })
            var m3 = helper.getNode("m3");
            m3.on("input", function(msg, send, done) { msg.payload *= 3 ; send(msg); done(); })

            var n1 = helper.getNode("link-call");
            var n4 = helper.getNode("n4");
            n4.on("input", function(msg) {
                try {
                    msg.should.have.property('payload', 24);
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:4});
        });
    })
});
