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
var clone = require("clone");

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
        it('should call static link-in node and get response', function (done) {
            var flow = [{ id: "link-in-1", type: "link in", wires: [["func"]] },
            { id: "func", type: "helper", wires: [["link-out-1"]] },
            { id: "link-out-1", type: "link out", mode: "return" },
            { id: "link-call", type: "link call", links: ["link-in-1"], wires: [["n4"]] },
            { id: "n4", type: "helper" }];
            helper.load(linkNode, flow, function () {
                var func = helper.getNode("func");
                func.on("input", function (msg, send, done) {
                    msg.payload = "123";
                    send(msg);
                    done();
                })
                var n1 = helper.getNode("link-call");
                var n4 = helper.getNode("n4");
                n4.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', '123');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                n1.receive({ payload: "hello" });
            });
        })

        it('should call link-in node by name and get response', function (done) {
            this.timeout(500);
            var payload = Date.now();
            var flow = [
                { id: "tab-flow-1", type: "tab", label: "Flow 1" },
                { id: "tab-flow-2", type: "tab", label: "Flow 2" },
                { id: "link-in-1", z: "tab-flow-1", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "link-in-2", z: "tab-flow-2", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "func", z: "tab-flow-1", type: "helper", wires: [["link-out-1"]] },
                { id: "link-out-1", z: "tab-flow-1", type: "link out", mode: "return" },
                { id: "link-call", z: "tab-flow-1", type: "link call", linkType: "dynamic", links: [], wires: [["n4"]] },
                { id: "n4", z: "tab-flow-1", type: "helper" }
            ];
            helper.load(linkNode, flow, function () {
                var func = helper.getNode("func");
                func.on("input", function (msg, send, done) {
                    msg.payload += msg.payload;
                    send(msg);
                    done();
                })
                var n1 = helper.getNode("link-call");
                var n4 = helper.getNode("n4");
                n4.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.eql(payload + payload);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                n1.receive({ payload: payload, target: "double payload" });
            });
        })
        // //TODO: This test is DISABLED - helper.load() calls callback but none of the nodes are available (issue loading a flow with a subflow)
        // it('should call link-in node by name in subflow', function (done) {
        //     this.timeout(9999500);
        //     var payload = Date.now();
        //     var flow = [
        //         {"id":"sub-flow-template","type":"subflow","name":"Subflow","info":"","category":"","in":[{"wires":[{"id":"link-call-1"}]}],"out":[{"wires":[{"id":"link-call-1","port":0}]}]},
        //         {"id":"link-call-1","type":"link call","z":"sub-flow-template","name":"","links":[],"linkType":"dynamic","timeout":"5","wires":[[]]},
        //         {"id":"link-in-1","type":"link in","z":"sub-flow-template","name":"double payload","links":[],"wires":[["func"]]},
        //         {"id":"func","type":"function","z":"sub-flow-template","name":"payload.a  x  payload.b","func":"msg.payload += msg.payload\nreturn msg;\n","outputs":1,"wires":[["link-out-1"]]},
        //         {"id":"link-out-1","type":"link out","z":"sub-flow-template","name":"","mode":"return","links":[],"wires":[]},
        //         {"id":"sub-flow-1","type":"subflow:sub-flow-template","z":"tab-flow-1","name":"","wires":[["n4"]]},
        //         { id: "n4", z: "tab-flow-1", type: "helper" }
        //     ];
        //     helper.load(linkNode, flow, function () {
        //         var sf = helper.getNode("sub-flow-1");
        //         var func = helper.getNode("func");
        //         var n4 = helper.getNode("n4");
        //         func.on("input", function (msg, send, done) {
        //             msg.payload += msg.payload;
        //             send(msg);
        //             done();
        //         })
        //         n4.on("input", function (msg) {
        //             try {
        //                 msg.should.have.property('payload');
        //                 msg.payload.should.eql(payload + payload);
        //                 done();
        //             } catch (err) {
        //                 done(err);
        //             }
        //         });
        //         sf.receive({ payload: payload, target: "double payload" });
        //     });
        // })
        it('should timeout waiting for link return', function (done) {
            this.timeout(1000);
            const flow = [
                { id: "tab-flow-1", type: "tab", label: "Flow 1" },
                { id: "link-in-1", z: "tab-flow-1", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "func", z: "tab-flow-1", type: "helper", wires: [["link-out-1"]] },
                { id: "link-out-1", z: "tab-flow-1", type: "link out", mode: "" }, //not return mode, cause link-call timeout
                { id: "link-call", z: "tab-flow-1", type: "link call", linkType: "static", "timeout": "0.5", links: ["link-in-1"], wires: [["n4"]] },
                { id: "catch-all", z: "tab-flow-1", type: "catch", scope: ["link-call"], uncaught: true, wires: [["n4"]] },
                { id: "n4", z: "tab-flow-1", type: "helper" }
            ];
            helper.load(linkNode, flow, function () {
                const funcNode = helper.getNode("func");
                const linkCallNode = helper.getNode("link-call");
                const helperNode = helper.getNode("n4");
                funcNode.on("input", function (msg, send, done) {
                    msg.payload += msg.payload;
                    send(msg);
                    done();
                })
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("target", "double payload");
                        msg.should.have.property("error");
                        msg.error.should.have.property("message", "timeout");
                        msg.error.should.have.property("source");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                linkCallNode.receive({ payload: "hello", target: "double payload" });
            });
        })
        it('should raise error due to multiple targets on same tab', function (done) {
            this.timeout(55500);
            const flow = [
                { id: "tab-flow-1", type: "tab", label: "Flow 1" },
                { id: "link-in-1", z: "tab-flow-1", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "link-in-2", z: "tab-flow-1", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "func", z: "tab-flow-1", type: "helper", wires: [["link-out-1"]] },
                { id: "link-out-1", z: "tab-flow-1", type: "link out", mode: "return" },
                { id: "link-call", z: "tab-flow-1", type: "link call", linkType: "dynamic", links: [], wires: [["n4"]] },
                { id: "catch-all", z: "tab-flow-1", type: "catch", scope: ["link-call"], uncaught: true, wires: [["n4"]] },
                { id: "n4", z: "tab-flow-1", type: "helper" }
            ];
            helper.load(linkNode, flow, function () {
                const funcNode = helper.getNode("func");
                const linkCall = helper.getNode("link-call");
                const helperNode = helper.getNode("n4");
                funcNode.on("input", function (msg, send, _done) {
                    done(new Error("Function should not be called"))
                })
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("target", "double payload");
                        msg.should.have.property("error");
                        msg.error.should.have.property("message");
                        msg.error.message.should.match(/.*Multiple link-in nodes.*/)
                        msg.error.should.have.property("source");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                linkCall.receive({ payload: "hello", target: "double payload" });
            });
        })
        it('should raise error due to multiple targets on different tabs', function (done) {
            this.timeout(500);
            const flow = [
                { id: "tab-flow-1", type: "tab", label: "Flow 1" },
                { id: "tab-flow-2", type: "tab", label: "Flow 2" },
                { id: "tab-flow-3", type: "tab", label: "Flow 3" },
                { id: "link-in-1", z: "tab-flow-2", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "link-in-2", z: "tab-flow-3", type: "link in", name: "double payload", wires: [["func"]] },
                { id: "func", z: "tab-flow-1", type: "helper", wires: [["link-out-1"]] },
                { id: "link-out-1", z: "tab-flow-1", type: "link out", mode: "return" },
                { id: "link-call", z: "tab-flow-1", type: "link call", linkType: "dynamic", links: [], wires: [["n4"]] },
                { id: "catch-all", z: "tab-flow-1", type: "catch", scope: ["link-call"], uncaught: true, wires: [["n4"]] },
                { id: "n4", z: "tab-flow-1", type: "helper" }
            ];
            helper.load(linkNode, flow, function () {
                const funcNode = helper.getNode("func");
                const linkCall = helper.getNode("link-call");
                const helperNode = helper.getNode("n4");
                funcNode.on("input", function (msg, send, _done) {
                    done(new Error("Function should not be called"))
                })
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("target", "double payload");
                        msg.should.have.property("error");
                        msg.error.should.have.property("message");
                        msg.error.message.should.match(/.*Multiple link-in nodes.*/)
                        msg.error.should.have.property("source");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                linkCall.receive({ payload: "hello", target: "double payload" });
            });
        })
        it('should not raise error after deploying a name change to a duplicate link-in node', async function () {
            this.timeout(400);
            const flow = [
                { id: "tab-flow-1", type: "tab", label: "Flow 1" },
                { id: "link-in-1", z: "tab-flow-1", type: "link in", name: "duplicate", wires: [["link-out-1"]] },
                { id: "link-in-2", z: "tab-flow-1", type: "link in", name: "duplicate", wires: [["link-out-1"]] }, //duplicate name
                { id: "link-out-1", z: "tab-flow-1", type: "link out", mode: "return" },
                { id: "link-call", z: "tab-flow-1", type: "link call", linkType: "dynamic", links: [], wires: [["n4"]] },
                { id: "n4", z: "tab-flow-1", type: "helper" }
            ];

            await helper.load(linkNode, flow)

            const linkIn2before = helper.getNode("link-in-2");
            linkIn2before.should.have.property("name", "duplicate") // check link-in-2 has been deployed with the duplicate name

            //modify the flow and deploy change
            const newConfig = clone(flow);
            newConfig[2].name = "add" // change nodes name
            await helper.setFlows(newConfig, "nodes") // deploy "nodes" only

            const helperNode = helper.getNode("n4");
            const linkCall2 = helper.getNode("link-call");
            const linkIn2after = helper.getNode("link-in-2");
            linkIn2after.should.have.property("name", "add") // check link-in-2 no longer has a duplicate name

            //poke { payload: "hello", target: "add" } into the link-call node and 
            //ensure that a message arrives via the link-in node named "add"
            await new Promise((resolve, reject) => {
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("target", "add");
                        msg.should.not.have.property("error");
                        resolve()
                    } catch (err) {
                        reject(err);
                    }
                });
                linkCall2.receive({ payload: "hello", target: "add" });
            });

        })
        it('should allow nested link-call flows', function(done) {
            this.timeout(500);
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
                        {id:"link-call-1", type:"link call", links:["li1"], wires:[["link-call-2"]]},
                        {id:"link-call-2", type:"link call", links:["li2"], wires:[["lo3"]]},
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
});
