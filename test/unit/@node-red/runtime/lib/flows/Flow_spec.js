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
var sinon = require('sinon');
var clone = require('clone');
var util = require("util");

var NR_TEST_UTILS = require("nr-test-utils");

var flowUtils = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/util");
var Flow = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/Flow");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/flows");
var Node = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/Node");
var credentials = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/credentials");
var hooks = NR_TEST_UTILS.require("@node-red/util/lib/hooks");
var typeRegistry = NR_TEST_UTILS.require("@node-red/registry");

describe('Flow', function() {
    var getType;

    var stoppedNodes = {};
    var stoppedOrder = [];
    var currentNodes = {};
    var rewiredNodes = {};
    var createCount = 0;

    beforeEach(function() {
        currentNodes = {};
        stoppedNodes = {};
        stoppedOrder =[];
        rewiredNodes = {};
        createCount = 0;
        Flow.init({settings:{},log:{
            log: sinon.stub(), // function() { console.log("l",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//
            debug: sinon.stub(), // function() { console.log("d",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
            trace: sinon.stub(), // function() { console.log("t",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
            warn: sinon.stub(), // function() { console.log("w",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
            info: sinon.stub(), // function() { console.log("i",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
            metric: sinon.stub(),
            _: function() { return "abc"}
        }});
    });

    var TestNode = function(n) {
        Node.call(this,n);
        this._index = createCount++;
        this.scope = n.scope;
        var node = this;
        this.foo = n.foo;
        this.bar = n.bar;
        this.handled = 0;
        this.stopped = false;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            // console.log(this.id,msg.payload);
            node.handled++;
            node.send(msg);
        });
        this.on('close',function() {
            node.stopped = true;
            stoppedNodes[node.id] = node;
            stoppedOrder.push(node.id)
            delete currentNodes[node.id];
        });
        this.__updateWires = this.updateWires;
        this.updateWires = function(newWires) {
            rewiredNodes[node.id] = node;
            node.newWires = newWires;
            node.__updateWires(newWires);
        };
    }
    util.inherits(TestNode,Node);

    var TestErrorNode = function(n) {
        Node.call(this,n);
        this._index = createCount++;
        this.scope = n.scope;
        this.name = n.name;
        var node = this;
        this.foo = n.foo;
        this.handled = 0;
        this.stopped = false;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            node.handled++;
            node.error("test error",msg);
        });
        this.on('close',function() {
            node.stopped = true;
            stoppedNodes[node.id] = node;
            stoppedOrder.push(node.id)
            delete currentNodes[node.id];
        });
        this.__updateWires = this.updateWires;
        this.updateWires = function(newWires) {
            rewiredNodes[node.id] = node;
            node.newWires = newWires;
            node.__updateWires(newWires);
        };
    }
    util.inherits(TestErrorNode,Node);

    var TestAsyncNode = function(n) {
        Node.call(this,n);
        var node = this;
        this.scope = n.scope;
        this.uncaught = n.uncaught;
        this.foo = n.foo;
        this.handled = 0;
        this.messages = [];
        this.stopped = false;
        this.closeDelay = n.closeDelay || 50;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            node.handled++;
            msg.handled = node.handled;
            node.messages.push(msg);
            node.send(msg);
        });
        this.on('close',function(done) {
            setTimeout(function() {
                node.stopped = true;
                stoppedNodes[node.id] = node;
                stoppedOrder.push(node.id)
                delete currentNodes[node.id];
                done();
            },node.closeDelay);
        });
    }
    util.inherits(TestAsyncNode,Node);

    var TestDoneNode = function(n) {
        Node.call(this,n);
        var node = this;
        this.scope = n.scope;
        this.uncaught = n.uncaught;
        this.foo = n.foo;
        this.handled = 0;
        this.messages = [];
        this.stopped = false;
        this.closeDelay = n.closeDelay || 50;
        currentNodes[node.id] = node;
        this.on('input',function(msg, send, done) {
            node.handled++;
            node.messages.push(msg);
            send(msg);
            done();
        });
        this.on('close',function(done) {
            setTimeout(function() {
                node.stopped = true;
                stoppedNodes[node.id] = node;
                stoppedOrder.push(node.id)
                delete currentNodes[node.id];
                done();
            },node.closeDelay);
        });
    }
    util.inherits(TestDoneNode,Node);

    before(function() {
        getType = sinon.stub(typeRegistry,"get").callsFake(function(type) {
            if (type=="test") {
                return TestNode;
            } else if (type=="testError"){
                return TestErrorNode;
            } else if (type=="testDone"){
                return TestDoneNode;
            } else {
                return TestAsyncNode;
            }
        });
    });
    after(function() {
        getType.restore();
    });

    describe('#constructor',function() {
        it('called with an empty flow',function() {
            var config = flowUtils.parseConfig([]);
            var flow = Flow.create({},config);

            var nodeCount = 0;
            Object.keys(flow.getActiveNodes()).length.should.equal(0);
        });
    });

    describe('#start',function() {
        it("instantiates an initial configuration and stops it", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();
            return new Promise((done) => {
                Object.keys(flow.getActiveNodes()).should.have.length(4);

                flow.getNode('1').should.have.a.property('id','1');
                flow.getNode('2').should.have.a.property('id','2');
                flow.getNode('3').should.have.a.property('id','3');
                flow.getNode('4').should.have.a.property('id','4');

                currentNodes.should.have.a.property("1");
                currentNodes.should.have.a.property("2");
                currentNodes.should.have.a.property("3");
                currentNodes.should.have.a.property("4");

                currentNodes["1"].should.have.a.property("handled",0);
                currentNodes["2"].should.have.a.property("handled",0);
                currentNodes["3"].should.have.a.property("handled",0);

                currentNodes["3"].on("input", function() {
                    currentNodes["1"].should.have.a.property("handled",1);
                    currentNodes["2"].should.have.a.property("handled",1);
                    currentNodes["3"].should.have.a.property("handled",1);

                    flow.stop().then(function() {
                        try {
                            currentNodes.should.not.have.a.property("1");
                            currentNodes.should.not.have.a.property("2");
                            currentNodes.should.not.have.a.property("3");
                            currentNodes.should.not.have.a.property("4");
                            stoppedNodes.should.have.a.property("1");
                            stoppedNodes.should.have.a.property("2");
                            stoppedNodes.should.have.a.property("3");
                            stoppedNodes.should.have.a.property("4");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                });
                currentNodes["1"].receive({payload:"test"});
            })
        });

        it("instantiates config nodes in the right order",async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"5"}, // This node depends on #5
                {id:"5",z:"t1",type:"test"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();
            Object.keys(flow.getActiveNodes()).should.have.length(5);
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes.should.have.a.property("4");
            currentNodes.should.have.a.property("5");

            currentNodes["1"].should.have.a.property("_index",2);
            currentNodes["2"].should.have.a.property("_index",3);
            currentNodes["3"].should.have.a.property("_index",4);
            currentNodes["4"].should.have.a.property("_index",1);
            currentNodes["5"].should.have.a.property("_index",0);

            return flow.stop().then(function() {
                currentNodes.should.not.have.a.property("1");
                currentNodes.should.not.have.a.property("2");
                currentNodes.should.not.have.a.property("3");
                currentNodes.should.not.have.a.property("4");
                currentNodes.should.not.have.a.property("5");
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                stoppedNodes.should.have.a.property("4");
                stoppedNodes.should.have.a.property("5");
            });
        });


        it("detects dependency loops in config nodes",async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"node1",z:"t1",type:"test",foo:"node2"}, // This node depends on #5
                {id:"node2",z:"t1",type:"test",foo:"node1"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            /*jshint immed: false */
            return flow.start().catch(err => {
                err.toString().should.equal("Error: Circular config node dependency detected: node1")
            })
        });

        it("rewires nodes specified by diff", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);

            var flow = Flow.create({},config,config.flows["t1"]);
            createCount.should.equal(0);
            await flow.start();
            //TODO: use update to pass in new wiring and verify the change
            createCount.should.equal(3);
            flow.start({rewired:["2"]});
            createCount.should.equal(3);
            rewiredNodes.should.have.a.property("2");
        });

        it("instantiates a node with environment variable property values", async function() {
            after(function() {
                delete process.env.NODE_RED_TEST_VALUE;
            })
            process.env.NODE_RED_TEST_VALUE = "a-value";
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"$(NODE_RED_TEST_VALUE)",wires:[]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:{a:"$(NODE_RED_TEST_VALUE)"},wires:[]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:" $(NODE_RED_TEST_VALUE)",wires:[]},
                {id:"4",x:10,y:10,z:"t1",type:"test",foo:"$(NODE_RED_TEST_VALUE) ",wires:[]},
                {id:"5",x:10,y:10,z:"t1",type:"test",foo:"$(NODE_RED_TEST_VALUE_NONE)",wires:[]},
                {id:"6",x:10,y:10,z:"t1",type:"test",foo:["$(NODE_RED_TEST_VALUE)"],wires:[]}
            ]);
            var flow = Flow.create({getSetting:v=>process.env[v]},config,config.flows["t1"]);
            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].foo.should.equal("a-value");
            activeNodes["2"].foo.a.should.equal("a-value");
            activeNodes["3"].foo.should.equal(" $(NODE_RED_TEST_VALUE)");
            activeNodes["4"].foo.should.equal("$(NODE_RED_TEST_VALUE) ");
            activeNodes["5"].foo.should.equal("$(NODE_RED_TEST_VALUE_NONE)");
            activeNodes["6"].foo[0].should.equal("a-value");

            await flow.stop()
        });

        it("ignores disabled nodes", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",d:true,type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"},
                {id:"5",z:"t1",type:"test",d:true,foo:"a"}

            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(3);

            flow.getNode('1').should.have.a.property('id','1');
            should.not.exist(flow.getNode('2'));
            flow.getNode('3').should.have.a.property('id','3');
            flow.getNode('4').should.have.a.property('id','4');
            should.not.exist(flow.getNode('5'));

            currentNodes.should.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes.should.have.a.property("4");

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["1"].should.have.a.property("handled",1);
            // Message doesn't reach 3 as 2 is disabled
            currentNodes["3"].should.have.a.property("handled",0);

            await flow.stop()
            currentNodes.should.not.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.not.have.a.property("3");
            currentNodes.should.not.have.a.property("4");
            stoppedNodes.should.have.a.property("1");
            stoppedNodes.should.not.have.a.property("2");
            stoppedNodes.should.have.a.property("3");
            stoppedNodes.should.have.a.property("4");
        });

    });

    describe('#stop', function() {


        it("stops all nodes", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"asyncTest",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");

            await flow.stop()
            currentNodes.should.not.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.not.have.a.property("3");
            stoppedNodes.should.have.a.property("1");
            stoppedNodes.should.have.a.property("2");
            stoppedNodes.should.have.a.property("3");
        });

        it("stops specified nodes", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");

            await flow.stop(["2"])
            currentNodes.should.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.have.a.property("3");
            stoppedNodes.should.not.have.a.property("1");
            stoppedNodes.should.have.a.property("2");
            stoppedNodes.should.not.have.a.property("3");
        });

        it("stops config nodes last", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"c1",z:"t1",type:"test"},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"c2",z:"t1",type:"test"},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"c3",z:"t1",type:"test"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes.should.have.a.property("c1");
            currentNodes.should.have.a.property("c2");
            currentNodes.should.have.a.property("c3");
            stoppedOrder.should.have.a.length(0);

            await flow.stop()
            stoppedOrder.should.eql([ '1', '2', '3', 'c1', 'c2', 'c3' ]);
        });


        it("Times out a node that fails to close", async function() {
            Flow.init({settings:{nodeCloseTimeout:50},log:{
                log: sinon.stub(),
                debug: sinon.stub(),
                trace: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                metric: sinon.stub(),
                _: function() { return "abc"}
            }});
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"testAsync",closeDelay: 80, foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");

            await flow.stop()
            currentNodes.should.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.not.have.a.property("3");
            stoppedNodes.should.not.have.a.property("1");
            stoppedNodes.should.have.a.property("2");
            stoppedNodes.should.have.a.property("3");
            await NR_TEST_UTILS.sleep(40)
            currentNodes.should.not.have.a.property("1");
            stoppedNodes.should.have.a.property("1");
        });

    });

    describe('#getNode',function() {
        it("gets a node known to the flow", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();
            Object.keys(flow.getActiveNodes()).should.have.length(4);
            flow.getNode('1').should.have.a.property('id','1');
            await flow.stop();
        });

        it("passes to parent if node not known locally", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"}
            ]);
            var flow = Flow.create({
                getNode: id => { return {id:id}}
            },config,config.flows["t1"]);
            await flow.start();
            Object.keys(flow.getActiveNodes()).should.have.length(4);
            flow.getNode('1').should.have.a.property('id','1');
            flow.getNode('parentNode').should.have.a.property('id','parentNode');
            await flow.stop()
        });

        it("does not pass to parent if cancelBubble set", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"}
            ]);
            var flow = Flow.create({
                getNode: id => { return {id:id}}
            },config,config.flows["t1"]);
            await flow.start();
            Object.keys(flow.getActiveNodes()).should.have.length(4);
            flow.getNode('1').should.have.a.property('id','1');
            should.not.exist(flow.getNode('parentNode',true));
            await flow.stop()
        });
    });

    describe("#handleStatus",function() {
        it("passes a status event to the adjacent status node", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);


            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status",random:"otherProperty"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];
            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","1");
            statusMessage.status.source.should.have.a.property("type","test");
            statusMessage.status.source.should.have.a.property("name","a");
            currentNodes["sn2"].should.have.a.property("handled",1);
            statusMessage = currentNodes["sn2"].messages[0];
            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("random","otherProperty");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","1");
            statusMessage.status.source.should.have.a.property("type","test");
            statusMessage.status.source.should.have.a.property("name","a");
            await flow.stop()
        });
        it("passes a status event to the adjacent scoped status node ", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",scope:["2"],foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"status",scope:["1"],foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);

            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status"});

            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",0);
            currentNodes["sn2"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn2"].messages[0];
            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","1");
            statusMessage.status.source.should.have.a.property("type","test");
            statusMessage.status.source.should.have.a.property("name","a");
            await flow.stop()
        });

        it("passes a status event to the group scoped status node", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id: "g1", type: "group", g: "g3", z:"t1" },
                {id: "g2", type: "group", z:"t1" },
                {id: "g3", type: "group", z:"t1" },
                {id:"1",x:10,y:10,z:"t1",g:"g1", type:"test",name:"a",wires:["2"]},
                // sn - in the same group as source node
                {id:"sn",x:10,y:10,z:"t1",g:"g1", type:"status",scope:"group",wires:[]},
                // sn2 - in a different group hierarchy to the source node
                {id:"sn2",x:10,y:10,z:"t1", g:"g2", type:"status",scope:"group",wires:[]},
                // sn3 - in a higher-level group to the source node
                {id:"sn3",x:10,y:10,z:"t1", g:"g3", type:"status",scope:"group",wires:[]},
                // sn2 - in a different group hierarchy, but not scope to the group
                {id:"sn4",x:10,y:10,z:"t1", g:"g2", type:"status",wires:[]},
                
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",1);
            currentNodes["sn2"].should.have.a.property("handled",0);
            currentNodes["sn3"].should.have.a.property("handled",1);
            currentNodes["sn3"].should.have.a.property("handled",1);
            await flow.stop()
        });
    });

    describe("#handleError",function() {
        it("passes an error event to the adjacent catch node", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]},
                {id:"sn3",x:10,y:10,z:"t1",type:"catch",uncaught:true,wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(6);
            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id","1");
            statusMessage.error.source.should.have.a.property("type","test");
            statusMessage.error.source.should.have.a.property("name","a");

            currentNodes["sn2"].should.have.a.property("handled",1);
            statusMessage = currentNodes["sn2"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id","1");
            statusMessage.error.source.should.have.a.property("type","test");
            statusMessage.error.source.should.have.a.property("name","a");

            // Node sn3 has uncaught:true - so should not get called
            currentNodes["sn3"].should.have.a.property("handled",0);
            await flow.stop()
        });

        it("passes an error event to the adjacent scoped catch node ", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",scope:["2"],foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"catch",scope:["1"],foo:"a",wires:[]},
                {id:"sn3",x:10,y:10,z:"t1",type:"catch",uncaught:true,wires:[]},
                {id:"sn4",x:10,y:10,z:"t1",type:"catch",uncaught:true,wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(7);

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",0);
            currentNodes["sn2"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn2"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id","1");
            statusMessage.error.source.should.have.a.property("type","test");
            statusMessage.error.source.should.have.a.property("name","a");

            // Node sn3/4 have uncaught:true - so should not get called
            currentNodes["sn3"].should.have.a.property("handled",0);
            currentNodes["sn4"].should.have.a.property("handled",0);

            // Inject error that sn1/2 will ignore - so should get picked up by sn3
            flow.handleError(config.flows["t1"].nodes["3"],"my-error-2",{a:"foo-2"});

            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",0);
            currentNodes["sn2"].should.have.a.property("handled",1);
            currentNodes["sn3"].should.have.a.property("handled",1);
            currentNodes["sn4"].should.have.a.property("handled",1);
            statusMessage = currentNodes["sn3"].messages[0];
            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error-2");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id","3");
            statusMessage.error.source.should.have.a.property("type","test");
            await flow.stop()
        });
        it("passes an error event to the group scoped catch node",async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id: "g1", type: "group", g: "g3", z:"t1" },
                {id: "g2", type: "group", z:"t1" },
                {id: "g3", type: "group", z:"t1" },
                {id:"1",x:10,y:10,z:"t1",g:"g1", type:"test",name:"a",wires:["2"]},
                // sn - in the same group as source node
                {id:"sn",x:10,y:10,z:"t1",g:"g1", type:"catch",scope:"group",wires:[]},
                // sn2 - in a different group hierarchy to the source node
                {id:"sn2",x:10,y:10,z:"t1", g:"g2", type:"catch",scope:"group",wires:[]},
                // sn3 - in a higher-level group to the source node
                {id:"sn3",x:10,y:10,z:"t1", g:"g3", type:"catch",scope:"group",wires:[]},
                // sn2 - in a different group hierarchy, but not scope to the group
                {id:"sn4",x:10,y:10,z:"t1", g:"g2", type:"catch",wires:[]},
                
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",1);
            currentNodes["sn2"].should.have.a.property("handled",0);
            currentNodes["sn3"].should.have.a.property("handled",1);
            currentNodes["sn3"].should.have.a.property("handled",1);
            await flow.stop()
        });

        it("moves any existing error object sideways", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo",error:"existing"});
            await NR_TEST_UTILS.sleep(50)
            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("_error","existing");
            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id","1");
            statusMessage.error.source.should.have.a.property("type","test");
            statusMessage.error.source.should.have.a.property("name","a");

            await flow.stop()
        });
        it("prevents an error looping more than 10 times",function(){});
    });

    describe("#handleComplete",function() {
        it("passes a complete event to the adjacent Complete node",async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"testDone",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"testDone",foo:"a",wires:[]},
                {id:"cn",x:10,y:10,z:"t1",type:"complete",scope:["1","3"],foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(4);

            var msg = {payload: "hello world"}
            var n1 = currentNodes["1"].receive(msg);
            await NR_TEST_UTILS.sleep(50)

            currentNodes["cn"].should.have.a.property("handled",2);
            currentNodes["cn"].messages[0].should.have.a.property("handled",1);
            currentNodes["cn"].messages[1].should.have.a.property("handled",2);
            await flow.stop()
        });
    });


    describe("#send", function() {
        it("sends a message - no cloning", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');
            var messageReceived = false;

            return new Promise((resolve, reject) => {
                const shutdownTest = async function(err) {
                    hooks.clear();
                    await flow.stop()
                    if (err) { reject(err) }
                    else { resolve() }
                }
                n2.receive = function(msg) {
                    messageReceived = true;
                    try {
                        msg.should.be.exactly(message);
                        shutdownTest();
                    } catch(err) {
                        shutdownTest(err);
                    }
                }

                var message = {payload:"hello"}
                flow.send([{
                    msg: message,
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined },
                    cloneMessage: false
                }])
                messageReceived.should.be.false()
            })
        })
        it("sends a message - cloning", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');

            return new Promise((resolve, reject) => {
                const shutdownTest = async function(err) {
                    hooks.clear();
                    await flow.stop()
                    if (err) { reject(err) }
                    else { resolve() }
                }
                n2.receive = function(msg) {
                    try {
                        // Message should be cloned
                        msg.should.be.eql(message);
                        msg.should.not.be.exactly(message);
                        shutdownTest();
                    } catch(err) {
                        shutdownTest(err);
                    }
                }

                var message = {payload:"hello"}
                flow.send([{
                    msg: message,
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined },
                    cloneMessage: true
                }])
            })
        })
        it("sends multiple messages", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');
            return new Promise((resolve, reject) => {
                const shutdownTest = async function(err) {
                    hooks.clear();
                    await flow.stop()
                    if (err) { reject(err) }
                    else { resolve() }
                }
                var messageCount = 0;
                n2.receive = function(msg) {
                    try {
                        msg.should.be.exactly(messages[messageCount++]);
                        if (messageCount === 2) {
                            shutdownTest();
                        }
                    } catch(err) {
                        shutdownTest(err);
                    }
                }

                var messages = [{payload:"hello"},{payload:"world"}];

                flow.send([{
                    msg: messages[0],
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined }
                },{
                    msg: messages[1],
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined }
                }])
            })  
        })
        it("sends a message - triggers hooks", async function() {
            const message = {payload:"hello"}
            var hookErrors = [];
            var messageReceived = false;
            var hooksCalled = [];
            hooks.add("onSend", function(sendEvents) {
                hooksCalled.push("onSend")
                try {
                    messageReceived.should.be.false()
                    sendEvents.should.have.length(1);
                    sendEvents[0].msg.should.be.exactly(message);
                } catch(err) {
                    hookErrors.push(err);
                }
            })
            hooks.add("preRoute", function(sendEvent) {
                hooksCalled.push("preRoute")
                try {
                    messageReceived.should.be.false()
                    sendEvent.msg.should.be.exactly(message);
                    should.not.exist(sendEvent.destination.node)
                } catch(err) {
                    hookErrors.push(err);
                }

            })
            hooks.add("preDeliver", function(sendEvent) {
                hooksCalled.push("preDeliver")
                try {
                    messageReceived.should.be.false()
                    // Cloning should have happened
                    sendEvent.msg.should.not.be.exactly(message);
                    // Destinatino node populated
                    should.exist(sendEvent.destination.node)
                } catch(err) {
                    hookErrors.push(err);
                }

            })
            hooks.add("postDeliver", function(sendEvent) {
                hooksCalled.push("postDeliver")
                try {
                    messageReceived.should.be.false()

                } catch(err) {
                    hookErrors.push(err);
                }

            })
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            await flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');
            return new Promise((resolve, reject) => {
                const shutdownTest = async function(err) {
                    hooks.clear();
                    await flow.stop()
                    if (err) { reject(err) }
                    else { resolve() }
                }
                n2.receive = function(msg) {
                    messageReceived = true;
                    try {
                        msg.should.be.eql(message);
                        msg.should.not.be.exactly(message);
                        hooksCalled.should.eql(["onSend","preRoute","preDeliver","postDeliver"])
                        if (hookErrors.length > 0) {
                            shutdownTest(hookErrors[0])
                        } else {
                            shutdownTest();
                        }
                    } catch(err) {
                        shutdownTest(err);
                    }
                }

                
                flow.send([{
                    msg: message,
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined },
                    cloneMessage: true
                }])
            })
        })

        describe("errors thrown by hooks are reported to the sending node", function() {
            var flow;
            var n1,n2;
            var messageReceived = false;
            var errorReceived = null;
            before(async function() {
                hooks.add("onSend", function(sendEvents) {
                    if (sendEvents[0].msg.payload === "trigger-onSend") {
                        throw new Error("onSend Error");
                    }
                })
                hooks.add("preRoute", function(sendEvent) {
                    if (sendEvent.msg.payload === "trigger-preRoute") {
                        throw new Error("preRoute Error");
                    }
                })
                hooks.add("preDeliver", function(sendEvent) {
                    if (sendEvent.msg.payload === "trigger-preDeliver") {
                        throw new Error("preDeliver Error");
                    }
                })
                hooks.add("postDeliver", function(sendEvent) {
                    if (sendEvent.msg.payload === "trigger-postDeliver") {
                        throw new Error("postDeliver Error");
                    }
                })
                var config = flowUtils.parseConfig([
                    {id:"t1",type:"tab"},
                    {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                    {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
                ]);
                flow = Flow.create({},config,config.flows["t1"]);
                await flow.start();
                n1 = flow.getNode('1');
                n2 = flow.getNode('2');
                n2.receive = function(msg) {
                    messageReceived = true;
                }
                n1.error = function(err) {
                    errorReceived = err;
                }

            })
            after(async function() {
                hooks.clear();
                await flow.stop()
            })
            beforeEach(function() {
                messageReceived = false;
                errorReceived = null;
            })
            function testHook(hook, msgExpected, done) {
                var message = {payload:"trigger-"+hook}
                flow.send([{
                    msg: message,
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined },
                    cloneMessage: true
                }])
                setTimeout(function() {
                    try {
                        messageReceived.should.equal(msgExpected);
                        should.exist(errorReceived)
                        errorReceived.toString().should.containEql(hook);
                        done();
                    } catch(err) {
                        done(err);
                    }
                },10)
            }

            it("onSend",  function(done) { testHook("onSend", false, done) })
            it("preRoute", function(done) { testHook("preRoute", false, done) })
            it("preDeliver",   function(done) { testHook("preDeliver", false, done) })
            it("postDeliver", function(done) { testHook("postDeliver", true, done) })
        })

        describe("hooks can stop the sending of messages", function() {
            var flow;
            var n1,n2;
            var messageReceived = false;
            var errorReceived = false;
            before(async function() {
                hooks.add("onSend", function(sendEvents) {
                    if (sendEvents[0].msg.payload === "trigger-onSend") {
                        return false
                    }
                })
                hooks.add("preRoute", function(sendEvent) {
                    if (sendEvent.msg.payload === "trigger-preRoute") {
                        return false
                    }
                })
                hooks.add("preDeliver", function(sendEvent) {
                    if (sendEvent.msg.payload === "trigger-preDeliver") {
                        return false
                    }
                })
                hooks.add("postDeliver", function(sendEvent) {
                    if (sendEvent.msg.payload === "trigger-postDeliver") {
                        return false
                    }
                })
                var config = flowUtils.parseConfig([
                    {id:"t1",type:"tab"},
                    {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                    {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
                ]);
                flow = Flow.create({},config,config.flows["t1"]);
                await flow.start();
                n1 = flow.getNode('1');
                n2 = flow.getNode('2');
                n2.receive = function(msg) {
                    messageReceived = true;
                }
                n1.error = function(err) {
                    errorReceived = true;
                }

            })
            after(async function() {
                hooks.clear();
                await flow.stop()
            })
            function testSend(payload,messageReceivedExpected,errorReceivedExpected,done) {
                messageReceived = false;
                errorReceived = false;
                flow.send([{
                    msg: {payload: payload},
                    source: { id:"1", node: n1 },
                    destination: { id:"2", node: undefined },
                    cloneMessage: true
                }])
                setTimeout(function() {
                    try {
                        messageReceived.should.eql(messageReceivedExpected)
                        errorReceived.should.eql(errorReceivedExpected)
                        done();
                    } catch(err) {
                        done(err);
                    }
                },10)
            }
            function testHook(hook, done) {
                testSend("pass",true,false,err => {
                    if (err) {
                        done(err)
                    } else {
                        testSend("trigger-"+hook,false,false,done);
                    }
                })
            }

            it("onSend",  function(done) { testHook("onSend", done) })
            it("preRoute", function(done) { testHook("preRoute", done) })
            it("preDeliver",   function(done) { testHook("preDeliver", done) })
            // postDeliver happens after delivery is scheduled so cannot stop it
            // it("postDeliver", function(done) { testHook("postDeliver", done) })
        })
    })

    describe("#env", function () {
        afterEach(() => {
            delete process.env.V0;
            delete process.env.V1;
            credentials.get.restore?.()
        })
        it("can instantiate a node with environment variable property values of group and tab", async function () {
            process.env.V0 = "gv0";
            process.env.V1 = "gv1";
            process.env.V3 = "gv3";
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab",env:[
                    {"name": "V0", value: "t1v0", type: "str"},
                    {"name": "V2", value: "t1v2", type: "str"}
                ]},
                {id:"g1",type:"group",z:"t1",env:[
                    {"name": "V0", value: "g1v0", type: "str"},
                    {"name": "V1", value: "g1v1", type: "str"}
                ]},
                {id:"g2",type:"group",z:"t1",g:"g1",env:[
                    {"name": "V1", value: "g2v1", type: "str"}
                ]},
                {id:"t1__V0",x:10,y:10,z:"t1",type:"test",foo:"${V0}",wires:[]}, // V0 will come from tab env V0
                {id:"t1g1V0",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"${V0}",wires:[]}, // V0 will come from group 1 env V0
                {id:"t1g1V1",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"${V1}",wires:[]}, // V1 will come from group 1 env V1
                {id:"t1g2V0",x:10,y:10,z:"t1",g:"g2",type:"test",foo:"${V0}",wires:[]}, // V0 will come from group 1 env V0
                {id:"t1g2V1",x:10,y:10,z:"t1",g:"g2",type:"test",foo:"${V1}",wires:[]}, // V1 will come from group 2 env V1
                {id:"t1g2V2",x:10,y:10,z:"t1",g:"g2",type:"test",foo:"${V2}",wires:[]}, // V2 will come from tab 1 env V2
                {id:"t1g2V3",x:10,y:10,z:"t1",g:"g2",type:"test",foo:"${V3}",wires:[]}, // V3 will come from process env V3

                {id:"t1__V1",x:10,y:10,z:"t1",type:"test",foo:"${V1}",wires:[]},
            ]);
            var flow = Flow.create({getSetting:v=>process.env[v]},config,config.flows["t1"]);
            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes.t1__V0.foo.should.equal("t1v0"); // node in tab 1, get tab 1 env V0
            activeNodes.t1__V1.foo.should.equal("gv1"); // node in tab 1, get V1, (tab 1 no V1) --> parent (global has V1)
            activeNodes.t1g1V0.foo.should.equal("g1v0"); // node in group 1, get V0, (group 1 has V0)
            activeNodes.t1g1V1.foo.should.equal("g1v1"); // node in group 1, get V1, (group 1 has V1)
            activeNodes.t1g2V0.foo.should.equal("g1v0"); // node in group 2, get V0, (group 2 no V0) --> parent (group 1 has V0)
            activeNodes.t1g2V1.foo.should.equal("g2v1"); // node in group 2, get V1, (group 2 has V1)
            activeNodes.t1g2V2.foo.should.equal("t1v2"); // node in group 2, get V2, (group 2 no V2) --> parent (tab 1 has V2)
            activeNodes.t1g2V3.foo.should.equal("gv3"); // node in group 2, get V3, (group 2 no V3) --> parent (tab 1 no V2) --> parent (global has V3)

            await flow.stop()
        });

        it("can access environment variable property using $parent", async function () {
            process.env.V0 = "gv0";
            process.env.V1 = "gv1";
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab",env:[
                    {"name": "V0", value: "v0", type: "str"}
                ]},
                {id:"g1",type:"group",z:"t1",env:[
                    {"name": "V0", value: "v1", type: "str"},
                    {"name": "V1", value: "v2", type: "str"}
                ]},
                {id:"g2",type:"group",z:"t1",g:"g1",env:[
                    {"name": "V1", value: "v3", type: "str"}
                ]},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"${$parent.V0}",wires:[]},
                {id:"2",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"${$parent.V0}",wires:[]},
                {id:"3",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"${$parent.V1}",wires:[]},
                {id:"4",x:10,y:10,z:"t1",g:"g2",type:"test",foo:"${$parent.V1}",wires:[]},
                {id:"5",x:10,y:10,z:"t1",type:"test",foo:"${$parent.V1}",wires:[]},
            ]);
            var flow = Flow.create({getSetting:v=>process.env[v]},config,config.flows["t1"]);
            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].foo.should.equal("gv0");
            activeNodes["2"].foo.should.equal("v0");
            activeNodes["3"].foo.should.equal("gv1");
            activeNodes["4"].foo.should.equal("v2");
            activeNodes["5"].foo.should.equal("gv1");

            await flow.stop()
        });

        it("can define environment variable using JSONata", async function () {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab",env:[
                    {"name": "V0", value: "1+2", type: "jsonata"}
                ]},
                {id:"g1",type:"group",z:"t1",env:[
                    {"name": "V1", value: "2+3", type: "jsonata"},
                ]},
                {id:"1",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"$(V0)",wires:[]},
                {id:"2",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"$(V1)",wires:[]},
            ]);
            var flow = Flow.create({getSetting:v=>process.env[v]},config,config.flows["t1"]);
            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].foo.should.equal(3);
            activeNodes["2"].foo.should.equal(5);

            await flow.stop()
        });

        it("can access global environment variables defined as JSONata values", async function () {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab",env:[
                    {"name": "V0", value: "1+2", type: "jsonata"}
                ]},
                {id:"g1",type:"group",z:"t1",env:[
                    {"name": "V1", value: "2+3", type: "jsonata"},
                ]},
                {id:"1",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"$(V0)",wires:[]},
                {id:"2",x:10,y:10,z:"t1",g:"g1",type:"test",foo:"$(V1)",wires:[]},
            ]);
            var flow = Flow.create({getSetting:v=>process.env[v]},config,config.flows["t1"]);
            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].foo.should.equal(3);
            activeNodes["2"].foo.should.equal(5);

            await flow.stop()
        });
        it("global flow can access global-config defined environment variables", async function () {
            sinon.stub(credentials,"get").callsFake(function(id) {
                if (id === 'gc') {
                    return { map: { GC_CRED: 'gc_cred' }}
                }
                return null
            })

            const config = flowUtils.parseConfig([
                {id:"gc", type:"global-config", env:[
                    {"name": "GC0", value: "3+4", type: "jsonata"},
                    {"name": "GC_CRED", type: "cred"},
                    
                ]},
                {id:"t1",type:"tab" },
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"${GC0}", bar:"${GC_CRED}", wires:[]},
            ]);
            // Two-arg call - makes this the global flow that handles global-config nodes
            const globalFlow = Flow.create({getSetting:v=>process.env[v]},config);
            await globalFlow.start();

            // Pass the globalFlow in as the parent flow to allow global-config lookup
            const flow = Flow.create(globalFlow,config,config.flows["t1"]);
            await flow.start();

            var activeNodes = flow.getActiveNodes();
            activeNodes["1"].foo.should.equal(7);
            activeNodes["1"].bar.should.equal('gc_cred');

            await flow.stop()
            await globalFlow.stop()
        });
    });

});
