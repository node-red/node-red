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

var Subflow = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/flows/Subflow");
var Flow = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/flows/Flow");

var flowUtils = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/flows/util");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/flows");
var Node = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/Node");
var typeRegistry = NR_TEST_UTILS.require("@node-red/registry");

describe('Subflow', function() {
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
        var runtime = {
            settings:{},
            log:{
                log: sinon.stub(), // function() { console.log("l",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//
                debug: sinon.stub(), // function() { console.log("d",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
                trace: sinon.stub(), // function() { console.log("t",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
                warn: sinon.stub(), // function() { console.log("w",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
                info: sinon.stub(), // function() { console.log("i",[...arguments].map(a => JSON.stringify(a)).join(" ")) },//sinon.stub(),
                metric: sinon.stub(),
                _: function() { return "abc"}
            }
        }
        Flow.init(runtime);
        Subflow.init(runtime);
    });

    var TestNode = function(n) {
        Node.call(this,n);
        this._index = createCount++;
        this.scope = n.scope;
        var node = this;
        this.foo = n.foo;
        this.handled = 0;
        this.stopped = false;
        this.received = null;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            // console.log(this.id,msg.payload);
            node.handled++;
            node.received = msg.payload;
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


    var TestStatusNode = function(n) {
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
            node.status({text:"test status"});
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
    util.inherits(TestStatusNode,Node);

    var TestAsyncNode = function(n) {
        Node.call(this,n);
        var node = this;
        this.scope = n.scope;
        this.foo = n.foo;
        this.handled = 0;
        this.messages = [];
        this.stopped = false;
        this.closeDelay = n.closeDelay || 50;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            node.handled++;
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

    var TestEnvNode = function(n) {
        Node.call(this,n);
        this._index = createCount++;
        this.scope = n.scope;
        this.foo = n.foo;
        var node = this;
        this.stopped = false;
        this.received = null;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            var flow = node._flow;
            var val = flow.getSetting("__KEY__");
            node.received = val;
            node.send({payload: val});
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
    util.inherits(TestEnvNode,Node);

    before(function() {
        getType = sinon.stub(typeRegistry,"get",function(type) {
            if (type=="test") {
                return TestNode;
            } else if (type=="testError"){
                return TestErrorNode;
            } else if (type=="testStatus"){
                return TestStatusNode;
            } else if (type=="testEnv"){
                return TestEnvNode;
            } else {
                return TestAsyncNode;
            }
        });
    });
    after(function() {
        getType.restore();
    });
    describe('#start',function() {
        it("instantiates a subflow and stops it",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3","4"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-2","port":0}]},{"wires":[{"id":"sf1","port":0}]}]},
                {id:"sf1-1",type:"test","z":"sf1",x:166,y:99,"wires":[["sf1-2"]]},
                {id:"sf1-2",type:"test","z":"sf1",foo:"sf1-cn",x:166,y:99,"wires":[[]]},
                {id:"sf1-cn",type:"test","z":"sf1"}
            ]);
            var flow = Flow.create({handleError: (a,b,c) => { console.log(a,b,c); }},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(4);
            // var sfInstanceId = Object.keys(activeNodes)[5];
            // var sfInstanceId2 = Object.keys(activeNodes)[6];
            var sfConfigId = Object.keys(activeNodes)[4];

            flow.getNode('1').should.have.a.property('id','1');
            flow.getNode('2').should.have.a.property('id','2');
            flow.getNode('3').should.have.a.property('id','3');
            flow.getNode('4').should.have.a.property('id','4');
            // flow.getNode(sfInstanceId).should.have.a.property('id',sfInstanceId);
            // flow.getNode(sfInstanceId2).should.have.a.property('id',sfInstanceId2);
            // flow.getNode(sfConfigId).should.have.a.property('id',sfConfigId);

            // flow.getNode(sfInstanceId2).should.have.a.property('foo',sfConfigId);

            Object.keys(currentNodes).should.have.length(6);

            currentNodes.should.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes.should.have.a.property("4");
            // currentNodes.should.have.a.property(sfInstanceId);
            // currentNodes.should.have.a.property(sfInstanceId2);
            // currentNodes.should.have.a.property(sfConfigId);

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);
            currentNodes["4"].should.have.a.property("handled",0);
            // currentNodes[sfInstanceId].should.have.a.property("handled",0);
            // currentNodes[sfInstanceId2].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});

            setTimeout(function() {
                currentNodes["1"].should.have.a.property("handled",1);
                // currentNodes[sfInstanceId].should.have.a.property("handled",1);
                // currentNodes[sfInstanceId2].should.have.a.property("handled",1);
                currentNodes["3"].should.have.a.property("handled",1);
                currentNodes["4"].should.have.a.property("handled",1);



                flow.stop().then(function() {
                    Object.keys(currentNodes).should.have.length(0);
                    Object.keys(stoppedNodes).should.have.length(6);

                    // currentNodes.should.not.have.a.property("1");
                    // currentNodes.should.not.have.a.property("3");
                    // currentNodes.should.not.have.a.property("4");
                    // // currentNodes.should.not.have.a.property(sfInstanceId);
                    // // currentNodes.should.not.have.a.property(sfInstanceId2);
                    // // currentNodes.should.not.have.a.property(sfConfigId);
                    // stoppedNodes.should.have.a.property("1");
                    // stoppedNodes.should.have.a.property("3");
                    // stoppedNodes.should.have.a.property("4");
                    // // stoppedNodes.should.have.a.property(sfInstanceId);
                    // // stoppedNodes.should.have.a.property(sfInstanceId2);
                    // // stoppedNodes.should.have.a.property(sfConfigId);
                    done();
                });
            },150);
        });
        it("instantiates a subflow inside a subflow and stops it",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3","4"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 1","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-2","port":0}]}]},
                {id:"sf2",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{wires:[]}],"out":[{"wires":[{"id":"sf2","port":0}]}]},
                {id:"sf1-1",type:"test","z":"sf1",x:166,y:99,"wires":[["sf1-2"]]},
                {id:"sf1-2",type:"subflow:sf2","z":"sf1",x:166,y:99,"wires":[[]]}

            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});

            setTimeout(function() {
                currentNodes["1"].should.have.a.property("handled",1);
                currentNodes["3"].should.have.a.property("handled",1);
                flow.stop().then(function() {
                    Object.keys(currentNodes).should.have.length(0);
                    done();
                });
            },150);
        });
        it("rewires a subflow node on update/start",function(done){

            var rawConfig = [
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-2","port":0}]}]},
                {id:"sf1-1",type:"test1","z":"sf1",x:166,y:99,"wires":[["sf1-2"]]},
                {id:"sf1-2",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]}
            ];

            var config = flowUtils.parseConfig(clone(rawConfig));

            rawConfig[2].wires = [["4"]];

            var newConfig = flowUtils.parseConfig(rawConfig);
            var diff = flowUtils.diffConfigs(config,newConfig);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(4);
            // var sfInstanceId = Object.keys(activeNodes)[4];
            // var sfInstanceId2 = Object.keys(activeNodes)[5];

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);
            currentNodes["4"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});

            setTimeout(function() {
                currentNodes["1"].should.have.a.property("handled",1);
                // currentNodes[sfInstanceId].should.have.a.property("handled",1);
                // currentNodes[sfInstanceId2].should.have.a.property("handled",1);
                currentNodes["3"].should.have.a.property("handled",1);
                currentNodes["4"].should.have.a.property("handled",0);

                flow.update(newConfig,newConfig.flows["t1"]);
                flow.start(diff)

                currentNodes["1"].receive({payload:"test2"});
                setTimeout(function() {

                    currentNodes["1"].should.have.a.property("handled",2);
                    // currentNodes[sfInstanceId].should.have.a.property("handled",2);
                    // currentNodes[sfInstanceId2].should.have.a.property("handled",2);
                    currentNodes["3"].should.have.a.property("handled",1);
                    currentNodes["4"].should.have.a.property("handled",1);


                    flow.stop().then(function() {
                        done();
                    });
                },150);
            },150);
        });
    });
    describe('#stop', function() {
        it("stops subflow instance nodes",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test","z":"sf1",x:166,y:99,"wires":[[]]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(3);
            Object.keys(stoppedNodes).should.have.length(0);
            flow.stop(["2"]).then(function() {
                Object.keys(currentNodes).should.have.length(2);
                Object.keys(stoppedNodes).should.have.length(1);
                done();
            }).catch(done);
        });
    });
    describe("#handleStatus",function() {
        it("passes a status event to the subflow's parent tab status node - all scope",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"testStatus",name:"test-status-node","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});
            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("status");
                statusMessage.status.should.have.a.property("text","test status");
                statusMessage.status.should.have.a.property("source");
                statusMessage.status.source.should.have.a.property("type","testStatus");
                statusMessage.status.source.should.have.a.property("name","test-status-node");

                flow.stop().then(function() {
                    done();
                });
            },150);
        });
        it("passes a status event to the subflow's parent tab status node - targetted scope",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"testStatus",name:"test-status-node","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",scope:["2"],wires:[]}
            ]);
            var parentFlowStatusCalled = false;

            var flow = Flow.create({handleStatus:() => { parentFlowStatusCalled = true} },config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});

            setTimeout(function() {
                parentFlowStatusCalled.should.be.false();

                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("status");
                statusMessage.status.should.have.a.property("text","test status");
                statusMessage.status.should.have.a.property("source");
                statusMessage.status.source.should.have.a.property("type","testStatus");
                statusMessage.status.source.should.have.a.property("name","test-status-node");

                flow.stop().then(function() {

                    done();
                });
            },150);
        });
    });

    describe("status node", function() {
        it("emits a status event when a message is passed to a subflow-status node - msg.payload as string", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {
                    id:"sf1",
                    type:"subflow",
                    name:"Subflow 2",
                    info:"",
                    in:[{wires:[{id:"sf1-1"}]}],
                    out:[{wires:[{id:"sf1-1",port:0}]}],
                    status:{wires:[{id:"sf1-1", port:0}]}
                },
                {id:"sf1-1",type:"test",name:"test","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test-payload"});

            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("status");
                statusMessage.status.should.have.a.property("text","test-payload");
                statusMessage.status.should.have.a.property("source");
                statusMessage.status.source.should.have.a.property("id","2");
                statusMessage.status.source.should.have.a.property("type","subflow:sf1");

                flow.stop().then(function() {

                    done();
                });
            },150);
        });
        it("emits a status event when a message is passed to a subflow-status node - msg.payload as status obj", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {
                    id:"sf1",
                    type:"subflow",
                    name:"Subflow 2",
                    info:"",
                    in:[{wires:[{id:"sf1-1"}]}],
                    out:[{wires:[{id:"sf1-1",port:0}]}],
                    status:{wires:[{id:"sf1-1", port:0}]}
                },
                {id:"sf1-1",type:"test",name:"test","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:{text:"payload-obj"}});

            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("status");
                statusMessage.status.should.have.a.property("text","payload-obj");
                statusMessage.status.should.have.a.property("source");
                statusMessage.status.source.should.have.a.property("id","2");
                statusMessage.status.source.should.have.a.property("type","subflow:sf1");

                flow.stop().then(function() {

                    done();
                });
            },150);
        });
        it("emits a status event when a message is passed to a subflow-status node - msg.status", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {
                    id:"sf1",
                    type:"subflow",
                    name:"Subflow 2",
                    info:"",
                    in:[{wires:[{id:"sf1-1"}]}],
                    out:[{wires:[{id:"sf1-1",port:0}]}],
                    status:{wires:[{id:"sf1-1", port:0}]}
                },
                {id:"sf1-1",type:"test",name:"test","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({status:{text:"status-obj"}});

            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("status");
                statusMessage.status.should.have.a.property("text","status-obj");
                statusMessage.status.should.have.a.property("source");
                statusMessage.status.source.should.have.a.property("id","2");
                statusMessage.status.source.should.have.a.property("type","subflow:sf1");

                flow.stop().then(function() {

                    done();
                });
            },150);
        });
        it("does not emit a regular status event if it contains a subflow-status node", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {
                    id:"sf1",
                    type:"subflow",
                    name:"Subflow 2",
                    info:"",
                    in:[{wires:[{id:"sf1-1"}]}],
                    out:[{wires:[{id:"sf1-1",port:0}]}],
                    status:{wires:[]}
                },
                {id:"sf1-1",type:"testStatus",name:"test-status-node","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test-payload"});

            currentNodes["sn"].should.have.a.property("handled",0);

            flow.stop().then(function() {

                done();
            });
        });
    })

    describe("#handleError",function() {
        it("passes an error event to the subflow's parent tab catch node - all scope",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",name:"test-error-node",type:"testError","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create({},config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});

            setTimeout(function() {
                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("error");
                statusMessage.error.should.have.a.property("message","test error");
                statusMessage.error.should.have.a.property("source");
                statusMessage.error.source.should.have.a.property("type","testError");
                statusMessage.error.source.should.have.a.property("name","test-error-node");

                flow.stop().then(function() {
                    done();
                });
            },150);
        });
        it("passes an error event to the subflow's parent tab catch node - targetted scope",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",name:"test-error-node",type:"testError","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",scope:["2"],wires:[]}
            ]);
            var parentFlowErrorCalled = false;
            var flow = Flow.create({handleError:() => { parentFlowErrorCalled = true} },config,config.flows["t1"]);

            flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});

            setTimeout(function() {
                parentFlowErrorCalled.should.be.false();

                currentNodes["sn"].should.have.a.property("handled",1);
                var statusMessage = currentNodes["sn"].messages[0];

                statusMessage.should.have.a.property("error");
                statusMessage.error.should.have.a.property("message","test error");
                statusMessage.error.should.have.a.property("source");
                statusMessage.error.source.should.have.a.property("type","testError");
                statusMessage.error.source.should.have.a.property("name","test-error-node");

                flow.stop().then(function() {
                    done();
                });
            },150);

        });
    });

    describe("#env var", function() {
        // should be changed according to internal env var representation
        function setEnv(node, key, val) {
            var flow = node._flow;
            if (flow) {
                var env = flow.env;
                if (!env) {
                    env = flow.env = {};
                }
                env[key] = {
                        name: key,
                        type: "str",
                        value: val
                };
            }
        }

        it("can access process env var", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 2",info:"",
                 "in":[ {wires:[{id:"sf1-1"}]} ],
                 "out":[ {wires:[{id:"sf1-2",port:0}]} ]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"testEnv",z:"sf1",foo:"sf1-cn",x:166,y:99,wires:[[]]}
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            flow.start();

            process.env["__KEY__"] = "__VAL__";

            currentNodes["1"].receive({payload: "test"});
            setTimeout(function() {
                currentNodes["3"].should.have.a.property("received", "__VAL__");

                flow.stop().then(function() {
                    done();
                });
            },150);
        });

        it("can access subflow env var", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 2",info:"",
                 "in":[ {wires:[{id:"sf1-1"}]} ],
                 "out":[ {wires:[{id:"sf1-2",port:0}]} ]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"testEnv",z:"sf1",foo:"sf1.2",x:166,y:99,wires:[[]]}
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            flow.start();

            var testenv_node = null;
            for (var n in currentNodes) {
                var node = currentNodes[n];
                if (node.type === "testEnv") {
                    testenv_node = node;
                    break;
                }
            }
            process.env["__KEY__"] = "__VAL0__";
            setEnv(testenv_node, "__KEY__", "__VAL1__");

            currentNodes["1"].receive({payload: "test"});
            setTimeout(function() {
                currentNodes["3"].should.have.a.property("received", "__VAL1__");

                flow.stop().then(function() {
                    done();
                });
            },150);
        });

        it("can access nested subflow env var", function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 1",info:"",
                 in:[{wires:[{id:"sf1-1"}]}],
                 out:[{wires:[{id:"sf1-2",port:0}]}]},
                {id:"sf2",type:"subflow",name:"Subflow 2",info:"",
                 in:[{wires:[{id:"sf2-1"}]}],
                 out:[{wires:[{id:"sf2-2",port:0}]}]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"subflow:sf2",z:"sf1",x:166,y:99,wires:[[]]},
                {id:"sf2-1",type:"test",z:"sf2",foo:"sf2.1",x:166,y:99,wires:[["sf2-2"]]},
                {id:"sf2-2",type:"testEnv",z:"sf2",foo:"sf2.2",x:166,y:99,wires:[[]]},
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            flow.start();

            var node_sf1_1 = null;
            var node_sf2_1 = null;
            var testenv_node = null;
            for (var n in currentNodes) {
                var node = currentNodes[n];
                if (node.foo === "sf1.1") {
                    node_sf1_1 = node;
                }
                if (node.foo === "sf2.1") {
                    node_sf2_1 = node;
                }
            }

            process.env["__KEY__"] = "__VAL0__";
            currentNodes["1"].receive({payload: "test"});
            setTimeout(function() {
                currentNodes["3"].should.have.a.property("received", "__VAL0__");

                setEnv(node_sf1_1, "__KEY__", "__VAL1__");
                currentNodes["1"].receive({payload: "test"});
                setTimeout(function() {
                    currentNodes["3"].should.have.a.property("received", "__VAL1__");

                    setEnv(node_sf2_1, "__KEY__", "__VAL2__");
                    currentNodes["1"].receive({payload: "test"});
                    setTimeout(function() {
                        currentNodes["3"].should.have.a.property("received", "__VAL2__");

                        flow.stop().then(function() {
                            done();
                        });
                    },150);
                },150);
            },150);
        });

    });

});
