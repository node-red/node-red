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

var Subflow = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/Subflow");
var Flow = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/Flow");

var flowUtils = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/util");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/flows");
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
        this.receivedEnv = null;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
            // console.log(this.id,msg.payload);
            node.handled++;
            node.received = msg.payload;
            node.receivedEnv = msg.receivedEnv;
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
            const receivedEnv = {}
            try {
                ['__KEY__','__KEY1__','__KEY2__','__KEY3__','__KEY4__'].forEach(k => {
                    receivedEnv[k] = flow.getSetting(k)
                })
            } catch (err) {
                console.log(err)
            }
            node.send({payload: val, receivedEnv});
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

    var TestNameEnvNode = function(n) {
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
            var val = flow.getSetting("NR_NODE_NAME");
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
    util.inherits(TestNameEnvNode,Node);

    var TestIDEnvNode = function(n) {
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
            var val = flow.getSetting("NR_NODE_ID");
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
    util.inherits(TestIDEnvNode,Node);

    before(function() {
        getType = sinon.stub(typeRegistry,"get").callsFake(function(type) {
            if (type=="test") {
                return TestNode;
            } else if (type=="testError"){
                return TestErrorNode;
            } else if (type=="testStatus"){
                return TestStatusNode;
            } else if (type=="testEnv"){
                return TestEnvNode;
            } else if (type=="testNameEnv"){
                return TestNameEnvNode;
            } else if (type=="testIDEnv"){
                return TestIDEnvNode;
            } else {
                return TestAsyncNode;
            }
        });
    });
    after(function() {
        getType.restore();
    });
    describe('#start',function() {
        it("instantiates a subflow and stops it", async function() {
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

            await flow.start();

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
           
            await NR_TEST_UTILS.sleep(150)

            currentNodes["1"].should.have.a.property("handled",1);
            // currentNodes[sfInstanceId].should.have.a.property("handled",1);
            // currentNodes[sfInstanceId2].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);
            currentNodes["4"].should.have.a.property("handled",1);

            await flow.stop()
            Object.keys(currentNodes).should.have.length(0);
            Object.keys(stoppedNodes).should.have.length(6);
        });

        it("instantiates a subflow inside a subflow and stops it", async function() {
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

            await flow.start();

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);
            await flow.stop()
            Object.keys(currentNodes).should.have.length(0);
        });

        it("rewires a subflow node on update/start", async function(){
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(4);
            // var sfInstanceId = Object.keys(activeNodes)[4];
            // var sfInstanceId2 = Object.keys(activeNodes)[5];

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);
            currentNodes["4"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["1"].should.have.a.property("handled",1);
            // currentNodes[sfInstanceId].should.have.a.property("handled",1);
            // currentNodes[sfInstanceId2].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);
            currentNodes["4"].should.have.a.property("handled",0);

            flow.update(newConfig,newConfig.flows["t1"]);
            await flow.start(diff)
            currentNodes["1"].receive({payload:"test2"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["1"].should.have.a.property("handled",2);
            // currentNodes[sfInstanceId].should.have.a.property("handled",2);
            // currentNodes[sfInstanceId2].should.have.a.property("handled",2);
            currentNodes["3"].should.have.a.property("handled",1);
            currentNodes["4"].should.have.a.property("handled",1);

            await flow.stop()
        });
    });
    describe('#stop', function() {
        it("stops subflow instance nodes", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(3);
            Object.keys(stoppedNodes).should.have.length(0);
            await flow.stop(["2"])
            Object.keys(currentNodes).should.have.length(2);
            Object.keys(stoppedNodes).should.have.length(1);
        });
    });
    describe("#handleStatus",function() {
        it("passes a status event to the subflow's parent tab status node - all scope", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","test status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("type","testStatus");
            statusMessage.status.source.should.have.a.property("name","test-status-node");

            await flow.stop()
        });
        it("passes a status event to the subflow's parent tab status node - targetted scope", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});

            await NR_TEST_UTILS.sleep(150)
            parentFlowStatusCalled.should.be.false();

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","test status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("type","testStatus");
            statusMessage.status.source.should.have.a.property("name","test-status-node");

            await flow.stop()
        });
    });

    describe("status node", function() {
        it("emits a status event when a message is passed to a subflow-status node - msg.payload as string", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test-payload"});
            await NR_TEST_UTILS.sleep(150)

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","test-payload");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","2");
            statusMessage.status.source.should.have.a.property("type","subflow:sf1");
            await flow.stop()
        });
        it("emits a status event when a message is passed to a subflow-status node - msg.payload as status obj", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:{text:"payload-obj"}});

            await NR_TEST_UTILS.sleep(150)

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","payload-obj");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","2");
            statusMessage.status.source.should.have.a.property("type","subflow:sf1");

            await flow.stop()
        });
        it("emits a status event when a message is passed to a subflow-status node - msg.status", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({status:{text:"status-obj"}});

            await NR_TEST_UTILS.sleep(150)

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","status-obj");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","2");
            statusMessage.status.source.should.have.a.property("type","subflow:sf1");

            flow.stop()
        });
        it("does not emit a regular status event if it contains a subflow-status node", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test-payload"});

            currentNodes["sn"].should.have.a.property("handled",0);

            await flow.stop()
        });
    })

    describe("#handleError",function() {
        it("passes an error event to the subflow's parent tab catch node - all scope",async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});
            
            await NR_TEST_UTILS.sleep(150)

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","test error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("type","testError");
            statusMessage.error.source.should.have.a.property("name","test-error-node");

            await flow.stop()
        });
        it("passes an error event to the subflow's parent tab catch node - targetted scope", async function() {
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

            await flow.start();

            var activeNodes = flow.getActiveNodes();

            activeNodes["1"].receive({payload:"test"});

            await NR_TEST_UTILS.sleep(150)
            
            parentFlowErrorCalled.should.be.false();

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","test error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("type","testError");
            statusMessage.error.source.should.have.a.property("name","test-error-node");

            await flow.stop()
        });
    });

    describe("#env var", function() {
        it("can access process env var", async function() {
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

            await flow.start();

            process.env["__KEY__"] = "__VAL__";

            currentNodes["1"].receive({payload: "test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["3"].should.have.a.property("received", "__VAL__");
            await flow.stop()
        });

        it("can access subflow env var", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 2",info:"",env: [{name: '__KEY__', value: '__VAL1__', type: 'str'}],
                    "in":[ {wires:[{id:"sf1-1"}]} ],
                    "out":[ {wires:[{id:"sf1-2",port:0}]} ]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"testEnv",z:"sf1",foo:"sf1.2",x:166,y:99,wires:[[]]}
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            await flow.start();

            var testenv_node = null;
            for (var n in currentNodes) {
                var node = currentNodes[n];
                if (node.type === "testEnv") {
                    testenv_node = node;
                    break;
                }
            }
            process.env["__KEY__"] = "__VAL0__";

            currentNodes["1"].receive({payload: "test"});
            await NR_TEST_UTILS.sleep(150)

            currentNodes["3"].should.have.a.property("received", "__VAL1__");
            await flow.stop()
        });

        it("can access nested subflow env var", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab", env: [{name: '__KEY1__', value: 't1', type: 'str'}]},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 1",info:"",
                    env: [{name: '__KEY2__', value: 'sf1', type: 'str'}],
                    in:[{wires:[{id:"sf1-1"}]}],
                    out:[{wires:[{id:"sf1-2",port:0}]}]},
                {id:"sf2",type:"subflow",name:"Subflow 2",info:"",
                    env: [{name: '__KEY3__', value: 'sf2', type: 'str'}],
                    in:[{wires:[{id:"sf2-1"}]}],
                    out:[{wires:[{id:"sf2-2",port:0}]}]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"subflow:sf2",z:"sf1",x:166,y:99,wires:[[]], env: [{name: '__KEY4__', value: 'sf1-2', type: 'str'}] },
                {id:"sf2-1",type:"test",z:"sf2",foo:"sf2.1",x:166,y:99,wires:[["sf2-2"]]},
                {id:"sf2-2",type:"testEnv",z:"sf2",foo:"sf2.2",x:166,y:99,wires:[[]]},
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            await flow.start();

            process.env["__KEY__"] = "__VAL0__";
            currentNodes["1"].receive({payload: "test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["3"].should.have.a.property("receivedEnv");
            currentNodes["3"].receivedEnv.should.have.a.property('__KEY__', '__VAL0__')
            currentNodes["3"].receivedEnv.should.have.a.property('__KEY1__', 't1')
            currentNodes["3"].receivedEnv.should.have.a.property('__KEY2__', 'sf1')
            currentNodes["3"].receivedEnv.should.have.a.property('__KEY3__', 'sf2')
            currentNodes["3"].receivedEnv.should.have.a.property('__KEY4__', 'sf1-2')
            
            await flow.stop()
        });

        it("can access name of subflow as env var", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",name:"SFN",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 2",info:"",
                 "in":[ {wires:[{id:"sf1-1"}]} ],
                 "out":[ {wires:[{id:"sf1-2",port:0}]} ]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"testNameEnv",z:"sf1",foo:"sf1.2",x:166,y:99,wires:[[]]}
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            await flow.start();

            currentNodes["1"].receive({payload: "test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["3"].should.have.a.property("received", "SFN");
            await flow.stop()
        });

        it("can access id of subflow as env var", async function() {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"t1.1",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",name:"SFN",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"t1.3",wires:[]},
                {id:"sf1",type:"subflow",name:"Subflow 2",info:"",
                 "in":[ {wires:[{id:"sf1-1"}]} ],
                 "out":[ {wires:[{id:"sf1-2",port:0}]} ]},
                {id:"sf1-1",type:"test",z:"sf1",foo:"sf1.1",x:166,y:99,wires:[["sf1-2"]]},
                {id:"sf1-2",type:"testIDEnv",z:"sf1",foo:"sf1.2",x:166,y:99,wires:[[]]}
            ]);
            var flow = Flow.create({
                getSetting: k=> process.env[k],
                handleError: (a,b,c) => { console.log(a,b,c); }
            },config,config.flows["t1"]);

            await flow.start();

            currentNodes["1"].receive({payload: "test"});
            await NR_TEST_UTILS.sleep(150)
            currentNodes["3"].should.have.a.property("received", "2");
            await flow.stop()
        });
    });

});
