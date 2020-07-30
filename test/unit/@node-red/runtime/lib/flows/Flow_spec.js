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
var hooks = NR_TEST_UTILS.require("@node-red/runtime/lib/hooks");
var typeRegistry = NR_TEST_UTILS.require("@node-red/registry");


describe('Flow', function() {
    var getType;

    var stoppedNodes = {};
    var currentNodes = {};
    var rewiredNodes = {};
    var createCount = 0;

    beforeEach(function() {
        currentNodes = {};
        stoppedNodes = {};
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
                delete currentNodes[node.id];
                done();
            },node.closeDelay);
        });
    }
    util.inherits(TestDoneNode,Node);

    before(function() {
        getType = sinon.stub(typeRegistry,"get",function(type) {
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
        it("instantiates an initial configuration and stops it",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

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
        });

        it("instantiates config nodes in the right order",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"5"}, // This node depends on #5
                {id:"5",z:"t1",type:"test"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

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

            flow.stop().then(function() {
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
                done();
            });
        });


        it("detects dependency loops in config nodes",function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"node1",z:"t1",type:"test",foo:"node2"}, // This node depends on #5
                {id:"node2",z:"t1",type:"test",foo:"node1"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            /*jshint immed: false */
            (function(){
                flow.start();
            }).should.throw("Circular config node dependency detected: node1");
        });

        it("rewires nodes specified by diff",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);

            var flow = Flow.create({},config,config.flows["t1"]);
            createCount.should.equal(0);
            flow.start();
            //TODO: use update to pass in new wiring and verify the change
            createCount.should.equal(3);
            flow.start({rewired:["2"]});
            createCount.should.equal(3);
            rewiredNodes.should.have.a.property("2");
            done();
        });

        it("instantiates a node with environment variable property values",function(done) {
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
            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].foo.should.equal("a-value");
            activeNodes["2"].foo.a.should.equal("a-value");
            activeNodes["3"].foo.should.equal(" $(NODE_RED_TEST_VALUE)");
            activeNodes["4"].foo.should.equal("$(NODE_RED_TEST_VALUE) ");
            activeNodes["5"].foo.should.equal("$(NODE_RED_TEST_VALUE_NONE)");
            activeNodes["6"].foo[0].should.equal("a-value");

            flow.stop().then(function() {
                done();
            });
        });

        it("ignores disabled nodes",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",d:true,type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"},
                {id:"5",z:"t1",type:"test",d:true,foo:"a"}

            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

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

            setTimeout(function() {
                currentNodes["1"].should.have.a.property("handled",1);
                // Message doesn't reach 3 as 2 is disabled
                currentNodes["3"].should.have.a.property("handled",0);

                flow.stop().then(function() {
                    try {
                        currentNodes.should.not.have.a.property("1");
                        currentNodes.should.not.have.a.property("2");
                        currentNodes.should.not.have.a.property("3");
                        currentNodes.should.not.have.a.property("4");
                        stoppedNodes.should.have.a.property("1");
                        stoppedNodes.should.not.have.a.property("2");
                        stoppedNodes.should.have.a.property("3");
                        stoppedNodes.should.have.a.property("4");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            },50);
        });

    });

    describe('#stop', function() {


        it("stops all nodes",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"asyncTest",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();


            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");

            flow.stop().then(function() {
                currentNodes.should.not.have.a.property("1");
                currentNodes.should.not.have.a.property("2");
                currentNodes.should.not.have.a.property("3");
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                done();
            }).catch(done);
        });

        it("stops specified nodes",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");

            flow.stop(["2"]).then(function() {
                currentNodes.should.have.a.property("1");
                currentNodes.should.not.have.a.property("2");
                currentNodes.should.have.a.property("3");
                stoppedNodes.should.not.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.not.have.a.property("3");
                done();
            });
        });

        it("Times out a node that fails to close", function(done) {
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
            flow.start();

            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");

            flow.stop().then(function() {
                currentNodes.should.have.a.property("1");
                currentNodes.should.not.have.a.property("2");
                currentNodes.should.not.have.a.property("3");
                stoppedNodes.should.not.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                setTimeout(function() {
                    currentNodes.should.not.have.a.property("1");
                    stoppedNodes.should.have.a.property("1");
                    done();
                },40)
            });
        });

    });

    describe('#getNode',function() {
        it("gets a node known to the flow",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",z:"t1",type:"test",foo:"a"}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(4);

            flow.getNode('1').should.have.a.property('id','1');

            flow.stop().then(() => { done() });
        });

        it("passes to parent if node not known locally",function(done) {
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
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(4);

            flow.getNode('1').should.have.a.property('id','1');

            flow.getNode('parentNode').should.have.a.property('id','parentNode');


            flow.stop().then(() => { done() });
        });

        it("does not pass to parent if cancelBubble set",function(done) {
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
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(4);

            flow.getNode('1').should.have.a.property('id','1');

            should.not.exist(flow.getNode('parentNode',true));
            flow.stop().then(() => { done() });
        });
    });

    describe("#handleStatus",function() {
        it("passes a status event to the adjacent status node",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);


            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status",random:"otherProperty"});

            setTimeout(function() {

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


                flow.stop().then(function() {
                    done();
                });
            },50)
        });
        it("passes a status event to the adjacent scoped status node ",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",scope:["2"],foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"status",scope:["1"],foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);


            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status"});

            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",0);
                currentNodes["sn2"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn2"].messages[0];

                statusMessage.should.have.a.property("status");
                statusMessage.status.should.have.a.property("text","my-status");
                statusMessage.status.should.have.a.property("source");
                statusMessage.status.source.should.have.a.property("id","1");
                statusMessage.status.source.should.have.a.property("type","test");
                statusMessage.status.source.should.have.a.property("name","a");


                flow.stop().then(function() {
                    done();
                });
            },50);
        });

    });

    describe("#handleError",function() {
        it("passes an error event to the adjacent catch node",function(done) {
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

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(6);


            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});

            setTimeout(function() {
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


                flow.stop().then(function() {
                    done();
                });
            },50);
        });
        it("passes an error event to the adjacent scoped catch node ",function(done) {
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

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(7);

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});

            setTimeout(function() {
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
                setTimeout(function() {
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

                    flow.stop().then(function() {
                        done();
                    });
                },50);
            },50);
        });
        it("moves any existing error object sideways",function(done){
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo",error:"existing"});
            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("_error","existing");
                statusMessage.should.have.a.property("error");
                statusMessage.error.should.have.a.property("message","my-error");
                statusMessage.error.should.have.a.property("source");
                statusMessage.error.source.should.have.a.property("id","1");
                statusMessage.error.source.should.have.a.property("type","test");
                statusMessage.error.source.should.have.a.property("name","a");

                flow.stop().then(function() {
                    done();
                });
            },50);
        });
        it("prevents an error looping more than 10 times",function(){});
    });

    describe("#handleComplete",function() {
        it("passes a complete event to the adjacent Complete node",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"testDone",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"testDone",foo:"a",wires:[]},
                {id:"cn",x:10,y:10,z:"t1",type:"complete",scope:["1","3"],foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(4);

            var msg = {payload: "hello world"}
            var n1 = currentNodes["1"].receive(msg);
            setTimeout(function() {
                currentNodes["cn"].should.have.a.property("handled",2);
                currentNodes["cn"].messages[0].should.have.a.property("handled",1);
                currentNodes["cn"].messages[1].should.have.a.property("handled",2);
                flow.stop().then(function() {
                    done();
                });
            },50);
        });
    });


    describe("#send", function() {
        it("sends a message - no cloning", function(done) {
            var shutdownTest = function(err) {
                hooks.clear();
                flow.stop().then(() => { done(err) });
            }
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');
            var messageReceived = false;
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
        it("sends a message - cloning", function(done) {
            var shutdownTest = function(err) {
                hooks.clear();
                flow.stop().then(() => { done(err) });
            }
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');

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
        it("sends multiple messages", function(done) {
            var shutdownTest = function(err) {
                hooks.clear();
                flow.stop().then(() => { done(err) });
            }
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');

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
        it("sends a message - triggers hooks", function(done) {
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
            var shutdownTest = function(err) {
                hooks.clear();
                flow.stop().then(() => { done(err) });
            }
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);
            flow.start();

            Object.keys(flow.getActiveNodes()).should.have.length(2);

            var n1 = flow.getNode('1');
            var n2 = flow.getNode('2');
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

            var message = {payload:"hello"}
            flow.send([{
                msg: message,
                source: { id:"1", node: n1 },
                destination: { id:"2", node: undefined },
                cloneMessage: true
            }])
        })

        describe("errors thrown by hooks are reported to the sending node", function() {
            var flow;
            var n1,n2;
            var messageReceived = false;
            var errorReceived = null;
            before(function() {
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
                flow.start();
                n1 = flow.getNode('1');
                n2 = flow.getNode('2');
                n2.receive = function(msg) {
                    messageReceived = true;
                }
                n1.error = function(err) {
                    errorReceived = err;
                }

            })
            after(function(done) {
                hooks.clear();
                flow.stop().then(() => { done() });
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
            before(function() {
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
                flow.start();
                n1 = flow.getNode('1');
                n2 = flow.getNode('2');
                n2.receive = function(msg) {
                    messageReceived = true;
                }
                n1.error = function(err) {
                    errorReceived = true;
                }

            })
            after(function(done) {
                hooks.clear();
                flow.stop().then(() => { done() });
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

});
