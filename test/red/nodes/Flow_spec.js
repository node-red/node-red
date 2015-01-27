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

var Flow = require("../../../red/nodes/Flow");
var flows = require("../../../red/nodes/flows");
var Node = require("../../../red/nodes/Node");

var typeRegistry = require("../../../red/nodes/registry");
var credentials = require("../../../red/nodes/credentials");


describe('Flow', function() {
    describe('#constructor',function() {
        it('called with an empty flow',function() {
            var config = [];
            var flow = new Flow(config);
            config.should.eql(flow.getFlow());
            
            var nodeCount = 0;
            flow.eachNode(function(node) {
                nodeCount++;
            });
            
            nodeCount.should.equal(0);
        });
        
        it('called with a non-empty flow with no missing types', function() {
            var getType = sinon.stub(typeRegistry,"get",function(type) {
                // For this test, don't care what the actual type is, just
                // that this returns a non-false result
                return {};
            });
            try {
                var config = [{id:"123",type:"test"}];
                var flow = new Flow(config);
                config.should.eql(flow.getFlow());
                
                flow.getMissingTypes().should.have.length(0);
            } finally {
                getType.restore();
            }
        });
        
        it('identifies missing types in a flow', function() {
            var getType = sinon.stub(typeRegistry,"get",function(type) {
                if (type == "test") {
                    return {};
                } else {
                    return null;
                }
            });
            try {
                var config = [{id:"123",type:"test"},{id:"456",type:"test1"},{id:"789",type:"test2"}];
                var flow = new Flow(config);
                config.should.eql(flow.getFlow());
                
                flow.getMissingTypes().should.eql(["test1","test2"]);
            } finally {
                getType.restore();
            }
        });
        
        it('extracts node credentials', function() {
            var getType = sinon.stub(typeRegistry,"get",function(type) {
                // For this test, don't care what the actual type is, just
                // that this returns a non-false result
                return {};
            });
            
            try {
                var config = [{id:"123",type:"test",credentials:{a:1,b:2}}];
                var resultingConfig = clone(config);
                delete resultingConfig[0].credentials;
                var flow = new Flow(config);
                flow.getFlow().should.eql(resultingConfig);
                flow.getMissingTypes().should.have.length(0);
            } finally {
                getType.restore();
            }
        });
        
    });
    describe('#start',function() {

        it('prevents a flow with missing types from starting', function() {
            var getType = sinon.stub(typeRegistry,"get",function(type) {
                if (type == "test") {
                    return {};
                } else {
                    return null;
                }
            });
            try {
                var config = [{id:"123",type:"test"},{id:"456",type:"test1"},{id:"789",type:"test2"}];
                var flow = new Flow(config);
                flow.getMissingTypes().should.have.length(2);
    
                /*jshint immed: false */
                (function() {
                    flow.start();
                }).should.throw();
            } finally {
                getType.restore();
            }
        });
    });
    
    describe('missing types',function() {
        it('removes missing types as they are registered', function() {
            var getType = sinon.stub(typeRegistry,"get",function(type) {
                if (type == "test") {
                    return {};
                } else {
                    return null;
                }
            });
            var flowStart;
            try {
                var config = [{id:"123",type:"test"},{id:"456",type:"test1"},{id:"789",type:"test2"}];
                var flow = new Flow(config);
    
                flowStart = sinon.stub(flow,"start",function() {this.started = true;});
                config.should.eql(flow.getFlow());
                
                flow.getMissingTypes().should.eql(["test1","test2"]);
                
                flow.typeRegistered("test1");
                flow.getMissingTypes().should.eql(["test2"]);
                flowStart.called.should.be.false;
    
                flow.typeRegistered("test2");
                flow.getMissingTypes().should.eql([]);
                flowStart.called.should.be.false;
            } finally {
                flowStart.restore();
                getType.restore();
            }
        });
        
        it('starts flows once all missing types are registered', function() {
            var getType = sinon.stub(typeRegistry,"get",function(type) {
                if (type == "test") {
                    return {};
                } else {
                    return null;
                }
            });
            var flowStart;
            try {
                var config = [{id:"123",type:"test"},{id:"456",type:"test1"},{id:"789",type:"test2"}];
                var flow = new Flow(config);
    
                // First call to .start throws err due to missing types
                /*jshint immed: false */
                (function() {
                    flow.start();
                }).should.throw();
    
                // Stub .start so when missing types are registered, we don't actually try starting them
                flowStart = sinon.stub(flow,"start",function() {});
                config.should.eql(flow.getFlow());
                
                flow.getMissingTypes().should.eql(["test1","test2"]);
                
                flow.typeRegistered("test1");
                flow.typeRegistered("test2");
                flow.getMissingTypes().should.have.length(0);
                flowStart.called.should.be.true;
            } finally {
                flowStart.restore();
                getType.restore();
            }
        });
    });
    
    describe('#diffFlow',function() {
        var getType;
        before(function() {
            getType = sinon.stub(typeRegistry,"get",function(type) {
                // For this test, don't care what the actual type is, just
                // that this returns a non-false result
                return {};
            });
                
        });
        after(function() {
            getType.restore();
        });
        
        it('handles an identical configuration', function() {
            var config = [{id:"123",type:"test",foo:"a",wires:[]}];
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(config);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",[]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('identifies nodes with changed properties, including downstream linked', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[0].foo = "b";
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["1"]);
            diffResult.should.have.property("linked",["2"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('identifies nodes with changed properties, including upstream linked', function() {
            var config =    [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].bar = "c";
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
                
        it('identifies nodes with changed credentials, including downstream linked', function() {
            var config =    [{id:"1",type:"test",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[0].credentials = {};
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["1"]);
            diffResult.should.have.property("linked",["2"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('identifies nodes with changed wiring', function() {
            var config =    [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0][0] = 2;
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });
        
        it('identifies nodes with changed wiring - second connection added', function() {
            var config =    [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0].push([1]);
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });
        
                it('identifies nodes with changed wiring - second connection added', function() {
            var config =    [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0].push([1]);
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });

        it('identifies nodes with changed wiring - node connected', function() {
            var config =  [{id:"1",type:"test",foo:"a",wires:[["2"]]},{id:"2",type:"test",bar:"b",wires:[[]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires.push("3");
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2","3"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });
        
        it('identifies new nodes', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig.push({id:"2",type:"test",bar:"b",wires:[[1]]});
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);

            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('identifies deleted nodes', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[[2]]},{id:"2",type:"test",bar:"b",wires:[[3]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig.splice(1,1);
            newConfig[0].wires = [];
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);

            diffResult.should.have.property("deleted",["2"]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",["1"]);
        });

        it('identifies config nodes changes', function() {
            var config = [{id:"1",type:"test",foo:"configNode",wires:[[2]]},{id:"2",type:"test",bar:"b",wires:[[3]]},{id:"3",type:"test",foo:"a",wires:[]},{id:"configNode",type:"testConfig"}];
            var newConfig = clone(config);
            newConfig[3].foo = "bar";
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);

            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["1","configNode"]);
            diffResult.should.have.property("linked",["2","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });

        it('marks a parent subflow as changed for an internal property change', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test",foo:"a"},
                {id:"4",type:"subflow:sf1"}
            ];
            
            var newConfig = clone(config);
            newConfig[4].foo = "b";
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);

            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2","4"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('marks a parent subflow as changed for an internal wiring change', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test"},
                {id:"sf1-2",z:"sf1",type:"test"}
            ];
            
            var newConfig = clone(config);
            newConfig[4].wires = [["sf1-2"]];
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        it('marks a parent subflow as changed for an internal node delete', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test"},
                {id:"sf1-2",z:"sf1",type:"test"}
            ];
            
            var newConfig = clone(config);
            newConfig.splice(5,1);
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        it('marks a parent subflow as changed for an internal subflow wiring change - input removed', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test"},
                {id:"sf1-2",z:"sf1",type:"test"}
            ];
            
            var newConfig = clone(config);
            newConfig[3].in[0].wires = [];
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        it('marks a parent subflow as changed for an internal subflow wiring change - input added', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test"},
                {id:"sf1-2",z:"sf1",type:"test"}
            ];
            
            var newConfig = clone(config);
            newConfig[3].in[0].wires.push({"id":"sf1-2"});
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('marks a parent subflow as changed for an internal subflow wiring change - output added', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test"},
                {id:"sf1-2",z:"sf1",type:"test"}
            ];
            
            var newConfig = clone(config);
            newConfig[3].out[0].wires.push({"id":"sf1-2","port":0});
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('marks a parent subflow as changed for an internal subflow wiring change - output removed', function() {
            var config = [
                {id:"1",type:"test",wires:[[2]]},
                {id:"2",type:"subflow:sf1",wires:[[3]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test"},
                {id:"sf1-2",z:"sf1",type:"test"}
            ];
            
            var newConfig = clone(config);
            newConfig[3].out[0].wires = [];
            
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
          
        
    });
    
    describe('#applyConfig',function() {
        var getType;
        var getNode;
        var credentialsClean;
        
        var stoppedNodes = {};
        var currentNodes = {};
        
        var TestNode = function(n) {
            Node.call(this,n);
            var node = this;
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
        }
        util.inherits(TestNode,Node);
        

        
        
        before(function() {
            getNode = sinon.stub(flows,"get",function(id) {
                return currentNodes[id];
            });
            getType = sinon.stub(typeRegistry,"get",function(type) {
                return TestNode;
            });
            credentialsClean = sinon.stub(credentials,"clean",function(config){});
                
        });
        after(function() {
            getType.restore();
            credentialsClean.restore();
            getNode.restore();
        });
        
        beforeEach(function() {
            currentNodes = {};
            stoppedNodes = {};
        });
        
        it("instantiates an initial configuration and stops it",function(done) {
            var config = [{id:"1",type:"test",foo:"a",wires:["2"]},{id:"2",type:"test",bar:"b",wires:[["3"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            
            var flow = new Flow(config);
            flow.start();
            
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            
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
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                done();
            });
        });

        it("stops all nodes on new full deploy",function(done) {
            var config = [{id:"1",type:"test",foo:"a",wires:["2"]},{id:"2",type:"test",bar:"b",wires:[["3"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = [{id:"4",type:"test",foo:"a",wires:["5"]},{id:"5",type:"test",bar:"b",wires:[["6"]]},{id:"6",type:"test",foo:"a",wires:[]}];
            
            var flow = new Flow(config);
            flow.start();
            
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            
            flow.applyConfig(newConfig).then(function() {
                currentNodes.should.not.have.a.property("1");
                currentNodes.should.not.have.a.property("2");
                currentNodes.should.not.have.a.property("3");
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                
                currentNodes.should.have.a.property("4");
                currentNodes.should.have.a.property("5");
                currentNodes.should.have.a.property("6");
                done();
            });
        });
        
        it("stops only modified nodes on 'nodes' deploy",function(done) {
            var config = [{id:"1",type:"test",name:"a",wires:["2"]},{id:"2",type:"test",name:"b",wires:[["3"]]},{id:"3",type:"test",name:"c",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].name = "B";
            
            var flow = new Flow(config);
            flow.start();
            
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes["2"].should.have.a.property("name","b");

            currentNodes["1"].receive({payload:"test"});
            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["2"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",1);

            
            flow.applyConfig(newConfig,"nodes").then(function() {
                currentNodes.should.have.a.property("1");
                currentNodes.should.have.a.property("2");
                currentNodes.should.have.a.property("3");
                currentNodes["2"].should.have.a.property("name","B");
                
                stoppedNodes.should.not.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.not.have.a.property("3");
                stoppedNodes["2"].should.have.a.property("name","b");
                
                
                currentNodes["1"].receive({payload:"test"});
                currentNodes["1"].should.have.a.property("handled",2);
                currentNodes["2"].should.have.a.property("handled",1);
                currentNodes["3"].should.have.a.property("handled",2);

                done();
            });
        });

        it("stops only modified flows on 'flows' deploy",function(done) {
            var config = [{id:"1",type:"test",name:"a",wires:["2"]},{id:"2",type:"test",name:"b",wires:[[]]},{id:"3",type:"test",name:"c",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].name = "B";
            
            var flow = new Flow(config);
            flow.start();
            
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            currentNodes["2"].should.have.a.property("name","b");
            
            currentNodes["1"].receive({payload:"test"});
            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["2"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",0);
            
            currentNodes["3"].receive({payload:"test"});
            currentNodes["3"].should.have.a.property("handled",1);
            
            flow.applyConfig(newConfig,"flows").then(function() {
                currentNodes.should.have.a.property("1");
                currentNodes.should.have.a.property("2");
                currentNodes.should.have.a.property("3");
                currentNodes["2"].should.have.a.property("name","B");
                
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.not.have.a.property("3");
                
                stoppedNodes["2"].should.have.a.property("name","b");
                
                currentNodes["1"].receive({payload:"test"});
                currentNodes["1"].should.have.a.property("handled",1);
                currentNodes["2"].should.have.a.property("handled",1);
                
                currentNodes["3"].receive({payload:"test"});
                currentNodes["3"].should.have.a.property("handled",2);
                
                done();
            });
        });
        
        it("rewires otherwise unmodified nodes on 'nodes' deploy",function(done) {
            var config = [{id:"1",type:"test",name:"a",wires:["2"]},{id:"2",type:"test",name:"b",wires:[[]]},{id:"3",type:"test",name:"c",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0].push("3");
            
            var flow = new Flow(config);
            flow.start();
            
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            
            currentNodes["1"].receive({payload:"test"});
            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["2"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",0);
            
            flow.applyConfig(newConfig,"nodes").then(function() {
                currentNodes.should.have.a.property("1");
                currentNodes.should.have.a.property("2");
                currentNodes.should.have.a.property("3");
                
                stoppedNodes.should.not.have.a.property("1");
                stoppedNodes.should.not.have.a.property("2");
                stoppedNodes.should.not.have.a.property("3");
                
                currentNodes["1"].receive({payload:"test"});
                currentNodes["1"].should.have.a.property("handled",2);
                currentNodes["2"].should.have.a.property("handled",2);
                currentNodes["3"].should.have.a.property("handled",1);
                
                done();
            });
        });

        it("stops rewired but otherwise unmodified nodes on 'flows' deploy",function(done) {
            var config = [{id:"1",type:"test",name:"a",wires:["2"]},{id:"2",type:"test",name:"b",wires:[[]]},{id:"3",type:"test",name:"c",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0].push("3");
            
            var flow = new Flow(config);
            flow.start();
            
            currentNodes.should.have.a.property("1");
            currentNodes.should.have.a.property("2");
            currentNodes.should.have.a.property("3");
            
            currentNodes["1"].receive({payload:"test"});
            currentNodes["1"].should.have.a.property("handled",1);
            currentNodes["2"].should.have.a.property("handled",1);
            currentNodes["3"].should.have.a.property("handled",0);
            
            flow.applyConfig(newConfig,"flows").then(function() {
                currentNodes.should.have.a.property("1");
                currentNodes.should.have.a.property("2");
                currentNodes.should.have.a.property("3");
                
                stoppedNodes.should.have.a.property("1");
                stoppedNodes.should.have.a.property("2");
                stoppedNodes.should.have.a.property("3");
                
                currentNodes["1"].receive({payload:"test"});
                currentNodes["1"].should.have.a.property("handled",1);
                currentNodes["2"].should.have.a.property("handled",1);
                currentNodes["3"].should.have.a.property("handled",1);
                
                done();
            });
        });
        
        
        
        
    });
});