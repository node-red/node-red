/**
 * Copyright 2015 IBM Corp.
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

var flowUtils = require("../../../../../red/runtime/nodes/flows/util");
var Flow = require("../../../../../red/runtime/nodes/flows/Flow");
var flows = require("../../../../../red/runtime/nodes/flows");
var Node = require("../../../../../red/runtime/nodes/Node");
var typeRegistry = require("../../../../../red/runtime/nodes/registry");


describe('Flow', function() {
    var getType;
    var getNode;

    var stoppedNodes = {};
    var currentNodes = {};
    var rewiredNodes = {};
    var createCount = 0;

    beforeEach(function() {
        currentNodes = {};
        stoppedNodes = {};
        rewiredNodes = {};
        createCount = 0;
    });

    var TestNode = function(n) {
        Node.call(this,n);
        createCount++;
        this.scope = n.scope;
        var node = this;
        this.foo = n.foo;
        this.handled = 0;
        this.stopped = false;
        currentNodes[node.id] = node;
        this.on('input',function(msg) {
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
            node.__updateWires[newWires];
        };
    }
    util.inherits(TestNode,Node);

    var TestAsyncNode = function(n) {
        Node.call(this,n);
        var node = this;
        this.scope = n.scope;
        this.foo = n.foo;
        this.handled = 0;
        this.messages = [];
        this.stopped = false;
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
            },50);
        });
    }
    util.inherits(TestAsyncNode,Node);

    before(function() {
        getType = sinon.stub(typeRegistry,"get",function(type) {
            if (type=="test") {
                return TestNode;
            } else {
                return TestAsyncNode;
            }
        });
        getNode = sinon.stub(flows,"get",function(id) {
            return currentNodes[id];
        });

    });
    after(function() {
        getType.restore();
        getNode.restore();
    });



    describe('#constructor',function() {
        it('called with an empty flow',function() {
            var config = flowUtils.parseConfig([]);
            var flow = Flow.create(config);

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
            var flow = Flow.create(config,config.flows["t1"]);
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


            currentNodes["1"].receive({payload:"test"});

            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["2"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);

            flow.stop().then(function() {
                currentNodes.should.not.have.a.property("1");
                currentNodes.should.not.have.a.property("2");
                currentNodes.should.not.have.a.property("3");
                currentNodes.should.not.have.a.property("4");
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                stoppedNodes.should.have.a.property("4");
                done();
            });
        });


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
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(7);
            var sfInstanceId = Object.keys(activeNodes)[5];
            var sfInstanceId2 = Object.keys(activeNodes)[6];
            var sfConfigId = Object.keys(activeNodes)[4];

            flow.getNode('1').should.have.a.property('id','1');
            flow.getNode('2').should.have.a.property('id','2');
            flow.getNode('3').should.have.a.property('id','3');
            flow.getNode('4').should.have.a.property('id','4');
            flow.getNode(sfInstanceId).should.have.a.property('id',sfInstanceId);
            flow.getNode(sfInstanceId2).should.have.a.property('id',sfInstanceId2);
            flow.getNode(sfConfigId).should.have.a.property('id',sfConfigId);

            flow.getNode(sfInstanceId2).should.have.a.property('foo',sfConfigId);

            currentNodes.should.have.a.property("1");
            currentNodes.should.not.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes.should.have.a.property("4");
            currentNodes.should.have.a.property(sfInstanceId);
            currentNodes.should.have.a.property(sfInstanceId2);
            currentNodes.should.have.a.property(sfConfigId);

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);
            currentNodes["4"].should.have.a.property("handled",0);
            currentNodes[sfInstanceId].should.have.a.property("handled",0);
            currentNodes[sfInstanceId2].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});

            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes[sfInstanceId].should.have.a.property("handled",1);
            currentNodes[sfInstanceId2].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);
            currentNodes["4"].should.have.a.property("handled",1);



            flow.stop().then(function() {
                currentNodes.should.not.have.a.property("1");
                currentNodes.should.not.have.a.property("3");
                currentNodes.should.not.have.a.property("4");
                currentNodes.should.not.have.a.property(sfInstanceId);
                currentNodes.should.not.have.a.property(sfInstanceId2);
                currentNodes.should.not.have.a.property(sfConfigId);
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("3");
                stoppedNodes.should.have.a.property("4");
                stoppedNodes.should.have.a.property(sfInstanceId);
                stoppedNodes.should.have.a.property(sfInstanceId2);
                stoppedNodes.should.have.a.property(sfConfigId);
                done();
            });
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
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});

            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);



            flow.stop().then(function() {
                Object.keys(currentNodes).should.have.length(0);
                done();
            });
        });

        it("rewires nodes specified by diff",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);

            var flow = Flow.create(config,config.flows["t1"]);
            createCount.should.equal(0);
            flow.start();
            //TODO: use update to pass in new wiring and verify the change
            createCount.should.equal(3);
            flow.start({rewired:["2"]});
            createCount.should.equal(3);
            rewiredNodes.should.have.a.property("2");
            done();
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
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(6);
            var sfInstanceId = Object.keys(activeNodes)[4];
            var sfInstanceId2 = Object.keys(activeNodes)[5];

            currentNodes["1"].should.have.a.property("handled",0);
            currentNodes["3"].should.have.a.property("handled",0);
            currentNodes["4"].should.have.a.property("handled",0);

            currentNodes["1"].receive({payload:"test"});

            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes[sfInstanceId].should.have.a.property("handled",1);
            currentNodes[sfInstanceId2].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);
            currentNodes["4"].should.have.a.property("handled",0);

            flow.update(newConfig,newConfig.flows["t1"]);
            flow.start(diff)

            currentNodes["1"].receive({payload:"test2"});

            currentNodes["1"].should.have.a.property("handled",2);
            currentNodes[sfInstanceId].should.have.a.property("handled",2);
            currentNodes[sfInstanceId2].should.have.a.property("handled",2);
            currentNodes["3"].should.have.a.property("handled",1);
            currentNodes["4"].should.have.a.property("handled",1);


            flow.stop().then(function() {
                done();
            });


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
            var flow = Flow.create(config,config.flows["t1"]);
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


    });

    describe('#stop', function() {


        it("stops all nodes",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"asyncTest",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);
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
            });
        });

        it("stops specified nodes",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",foo:"a",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);
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
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(4);
            var sfInstanceId = Object.keys(activeNodes)[3];
            flow.stop(["2"]).then(function() {
                currentNodes.should.not.have.a.property(sfInstanceId);
                stoppedNodes.should.have.a.property(sfInstanceId);
                done();
            });
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
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);


            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status"});

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
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id","1");
            statusMessage.status.source.should.have.a.property("type","test");
            statusMessage.status.source.should.have.a.property("name","a");


            flow.stop().then(function() {
                done();
            });
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
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);


            flow.handleStatus(config.flows["t1"].nodes["1"],{text:"my-status"});

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
        });

        it("passes a status event to the adjacent status node in subflow",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sf1-sn",x:10,y:10,z:"sf1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            var sfInstanceId = Object.keys(activeNodes)[3];
            var statusInstanceId = Object.keys(activeNodes)[4];

            flow.handleStatus(activeNodes[sfInstanceId],{text:"my-status"});

            currentNodes[statusInstanceId].should.have.a.property("handled",1);
            var statusMessage = currentNodes[statusInstanceId].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id",sfInstanceId);
            statusMessage.status.source.should.have.a.property("type","test2");
            statusMessage.status.source.should.have.a.property("name",undefined);
            flow.stop().then(function() {

                done();
            });
        });
        it("passes a status event to the multiple adjacent status nodes in subflow",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"4",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sf1-sn",x:10,y:10,z:"sf1",type:"status",foo:"a",wires:[]},
                {id:"sf1-sn2",x:10,y:10,z:"sf1",type:"status",scope:["none"],wires:[]},
                {id:"sf1-sn3",x:10,y:10,z:"sf1",type:"status",scope:["sf1-1"],wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();

            var sfInstanceId = Object.keys(activeNodes)[4];
            var statusInstanceId = Object.keys(activeNodes)[5];
            var statusInstanceId2 = Object.keys(activeNodes)[6];
            var statusInstanceId3 = Object.keys(activeNodes)[7];

            flow.handleStatus(activeNodes[sfInstanceId],{text:"my-status"});

            currentNodes[statusInstanceId].should.have.a.property("handled",1);
            var statusMessage = currentNodes[statusInstanceId].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id",sfInstanceId);
            statusMessage.status.source.should.have.a.property("type","test2");
            statusMessage.status.source.should.have.a.property("name",undefined);

            activeNodes["4"].should.have.a.property("handled",0);

            currentNodes[statusInstanceId2].should.have.a.property("handled",0);

            currentNodes[statusInstanceId3].should.have.a.property("handled",1);
            statusMessage = currentNodes[statusInstanceId3].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id",sfInstanceId);
            statusMessage.status.source.should.have.a.property("type","test2");
            statusMessage.status.source.should.have.a.property("name",undefined);

            flow.stop().then(function() {

                done();
            });
        });
        it("passes a status event to the subflow's parent tab status node",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"status",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            var sfInstanceId = Object.keys(activeNodes)[3];

            flow.handleStatus(activeNodes[sfInstanceId],{text:"my-status"});

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("status");
            statusMessage.status.should.have.a.property("text","my-status");
            statusMessage.status.should.have.a.property("source");
            statusMessage.status.source.should.have.a.property("id",sfInstanceId);
            statusMessage.status.source.should.have.a.property("type","test2");
            statusMessage.status.source.should.have.a.property("name",undefined);

            flow.stop().then(function() {

                done();
            });
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
                {id:"sn2",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);


            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});

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


            flow.stop().then(function() {
                done();
            });
        });
        it("passes an error event to the adjacent scoped catch node ",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",scope:["2"],foo:"a",wires:[]},
                {id:"sn2",x:10,y:10,z:"t1",type:"catch",scope:["1"],foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            Object.keys(activeNodes).should.have.length(5);

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo"});

            currentNodes["sn"].should.have.a.property("handled",0);
            currentNodes["sn2"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn2"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id","1");
            statusMessage.error.source.should.have.a.property("type","test");
            statusMessage.error.source.should.have.a.property("name","a");


            flow.stop().then(function() {
                done();
            });
        });

        it("passes an error event to the adjacent catch node in subflow",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sf1-sn",x:10,y:10,z:"sf1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            var sfInstanceId = Object.keys(activeNodes)[3];
            var catchInstanceId = Object.keys(activeNodes)[4];

            flow.handleError(activeNodes[sfInstanceId],"my-error",{a:"foo"});

            currentNodes[catchInstanceId].should.have.a.property("handled",1);
            var statusMessage = currentNodes[catchInstanceId].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id",sfInstanceId);
            statusMessage.error.source.should.have.a.property("type","test2");
            statusMessage.error.source.should.have.a.property("name",undefined);

            flow.stop().then(function() {
                done();
            });
        });

        it("passes an error event to the multiple adjacent catch nodes in subflow",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sf1-sn",x:10,y:10,z:"sf1",type:"catch",foo:"a",wires:[]},
                {id:"sf1-sn2",x:10,y:10,z:"sf1",type:"catch",scope:["none"],wires:[]},
                {id:"sf1-sn3",x:10,y:10,z:"sf1",type:"catch",scope:["sf1-1"],wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            var sfInstanceId = Object.keys(activeNodes)[3];
            var catchInstanceId = Object.keys(activeNodes)[4];
            var catchInstanceId2 = Object.keys(activeNodes)[5];
            var catchInstanceId3 = Object.keys(activeNodes)[6];

            flow.handleError(activeNodes[sfInstanceId],"my-error",{a:"foo"});

            currentNodes[catchInstanceId].should.have.a.property("handled",1);
            var statusMessage = currentNodes[catchInstanceId].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id",sfInstanceId);
            statusMessage.error.source.should.have.a.property("type","test2");
            statusMessage.error.source.should.have.a.property("name",undefined);

            currentNodes[catchInstanceId2].should.have.a.property("handled",0);

            currentNodes[catchInstanceId3].should.have.a.property("handled",1);
            statusMessage = currentNodes[catchInstanceId3].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id",sfInstanceId);
            statusMessage.error.source.should.have.a.property("type","test2");
            statusMessage.error.source.should.have.a.property("name",undefined);

            flow.stop().then(function() {

                done();
            });
        });
        it("passes an error event to the subflow's parent tab catch node",function(done) {
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"subflow:sf1",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sf1",type:"subflow","name":"Subflow 2","info":"",
                    "in":[{"wires":[{"id":"sf1-1"}]}],"out":[{"wires":[{"id":"sf1-1","port":0}]}]},
                {id:"sf1-1",type:"test2","z":"sf1",x:166,y:99,"wires":[[]]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();
            var sfInstanceId = Object.keys(activeNodes)[3];

            flow.handleError(activeNodes[sfInstanceId],"my-error",{a:"foo"});

            currentNodes["sn"].should.have.a.property("handled",1);
            var statusMessage = currentNodes["sn"].messages[0];

            statusMessage.should.have.a.property("error");
            statusMessage.error.should.have.a.property("message","my-error");
            statusMessage.error.should.have.a.property("source");
            statusMessage.error.source.should.have.a.property("id",sfInstanceId);
            statusMessage.error.source.should.have.a.property("type","test2");
            statusMessage.error.source.should.have.a.property("name",undefined);

            flow.stop().then(function() {
                done();
            });
        });
        it("moves any existing error object sideways",function(done){
            var config = flowUtils.parseConfig([
                {id:"t1",type:"tab"},
                {id:"1",x:10,y:10,z:"t1",type:"test",name:"a",wires:["2"]},
                {id:"2",x:10,y:10,z:"t1",type:"test",wires:["3"]},
                {id:"3",x:10,y:10,z:"t1",type:"test",foo:"a",wires:[]},
                {id:"sn",x:10,y:10,z:"t1",type:"catch",foo:"a",wires:[]}
            ]);
            var flow = Flow.create(config,config.flows["t1"]);

            getNode.restore();
            getNode = sinon.stub(flows,"get",function(id) {
                return flow.getNode(id);
            });

            flow.start();

            var activeNodes = flow.getActiveNodes();

            flow.handleError(config.flows["t1"].nodes["1"],"my-error",{a:"foo",error:"existing"});

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
        });
        it.skip("prevents an error looping more than 10 times",function(){});
    });
});
