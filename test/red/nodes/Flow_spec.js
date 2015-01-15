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
var Flow = require("../../../red/nodes/Flow");

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
            var config =    [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = [{id:"1",type:"test",foo:"b",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
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
            var newConfig = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"c",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",["2"]);
            diffResult.should.have.property("linked",["1"]);
            diffResult.should.have.property("wiringChanged",[]);
        });
        
        it('identifies nodes with changed wiring', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[2]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });
        
        it('identifies nodes with changed wiring - second connection added', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1],[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });
        
        it('identifies nodes with changed wiring - second connection removed', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1],[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);
        
            diffResult.should.have.property("deleted",[]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","2"]);
            diffResult.should.have.property("wiringChanged",["2"]);
        });
        
        it('identifies new nodes', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
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
            var newConfig = [{id:"1",type:"test",foo:"a",wires:[]},{id:"3",type:"test",foo:"a",wires:[]}];
            var flow = new Flow(config);
            flow.getMissingTypes().should.have.length(0);
            
            var diffResult = flow.diffFlow(newConfig);

            diffResult.should.have.property("deleted",["2"]);
            diffResult.should.have.property("changed",[]);
            diffResult.should.have.property("linked",["1","3"]);
            diffResult.should.have.property("wiringChanged",["1"]);
        });
    });
});