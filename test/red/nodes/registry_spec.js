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

var should = require("should");
var sinon = require("sinon");

var RedNodes = require("../../../red/nodes");
var RedNode = require("../../../red/nodes/Node");
var typeRegistry = require("../../../red/nodes/registry");
var events = require("../../../red/events");

afterEach(function() {
    typeRegistry.clear();
});

describe('NodeRegistry', function() {
    it('automatically registers new nodes',function() {
        var testNode = RedNodes.getNode('123');
        should.not.exist(n);
        var n = new RedNode({id:'123',type:'abc'});
        
        var newNode = RedNodes.getNode('123');
        
        should.strictEqual(n,newNode);
    });
    
    it('handles nodes that export a function', function(done) {
        typeRegistry.init({});
        typeRegistry.load(__dirname+"/resources/TestNode1").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("types",["test-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            var nodeConstructor = typeRegistry.get("test-node-1");
            (typeof nodeConstructor).should.be.equal("function");
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    
    it('handles nodes that export a function returning a resolving promise', function(done) {
        typeRegistry.init({});
        typeRegistry.load(__dirname+"/resources/TestNode2").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode2.js");
            list[0].should.have.property("types",["test-node-2"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            var nodeConstructor = typeRegistry.get("test-node-2");
            (typeof nodeConstructor).should.be.equal("function");
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    it('handles nodes that export a function returning a rejecting promise', function(done) {
        typeRegistry.init({});
        typeRegistry.load(__dirname+"/resources/TestNode3").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode3.js");
            list[0].should.have.property("types",["test-node-3"]);
            list[0].should.have.property("enabled",false);

            list[0].should.have.property("err","fail");

            var nodeConstructor = typeRegistry.get("test-node-3");
            (typeof nodeConstructor).should.be.equal("undefined");
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    it('handles files containing multiple nodes', function(done) {
        typeRegistry.init({});
        typeRegistry.load(__dirname+"/resources/MultipleNodes1").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","MultipleNodes1.js");
            list[0].should.have.property("types",["test-node-multiple-1a","test-node-multiple-1b"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            var nodeConstructor = typeRegistry.get("test-node-multiple-1a");
            (typeof nodeConstructor).should.be.equal("function");

            nodeConstructor = typeRegistry.get("test-node-multiple-1b");
            (typeof nodeConstructor).should.be.equal("function");
            
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('handles nested directories', function(done) {
        typeRegistry.init({});
        typeRegistry.load(__dirname+"/resources/NestedDirectoryNode").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","NestedNode.js");
            list[0].should.have.property("types",["nested-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('emits type-registered and node-icon-dir events', function(done) {
        var eventEmitSpy = sinon.spy(events,"emit");
        typeRegistry.init({});
        typeRegistry.load(__dirname+"/resources/NestedDirectoryNode").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("name","NestedNode.js");
            list[0].should.have.property("types",["nested-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            eventEmitSpy.calledTwice.should.be.true;
            
            eventEmitSpy.firstCall.args[0].should.be.equal("node-icon-dir");
            eventEmitSpy.firstCall.args[1].should.be.equal(__dirname+"/resources/NestedDirectoryNode/NestedNode/icons");

            eventEmitSpy.secondCall.args[0].should.be.equal("type-registered");
            eventEmitSpy.secondCall.args[1].should.be.equal("nested-node-1");
            
            done();
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            eventEmitSpy.restore();
        });
    });
    
    it('rejects a duplicate node type registration', function(done) {
        typeRegistry.init({
            nodesDir:[__dirname+"/resources/TestNode1",__dirname+"/resources/DuplicateTestNode"]
        });
        typeRegistry.load("wontexist").then(function() {
            var list = typeRegistry.getNodeList();
            
            list.should.be.an.Array.and.have.lengthOf(2);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("types",["test-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            list[1].should.have.property("id");
            list[1].id.should.not.equal(list[0].id);
            
            list[1].should.have.property("name","TestNode1.js");
            list[1].should.have.property("types",["test-node-1"]);
            list[1].should.have.property("enabled",false);
            list[1].should.have.property("err");
            /already registered/.test(list[1].err).should.be.true;

            var nodeConstructor = typeRegistry.get("test-node-1");
            // Verify the duplicate node hasn't replaced the original one
            nodeConstructor.name.should.be.equal("TestNode");
            
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('handles nodesDir as a string', function(done) {
        var settings = {
            nodesDir : __dirname+"/resources/TestNode1"
        }

        typeRegistry.init(settings);
        typeRegistry.load("wontexist").then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("types",["test-node-1"]);
            done();
        }).catch(function(e) {
            done("Loading of non-existing nodesDir should succeed");
        });
            
    });
    
    it('handles invalid nodesDir',function(done) {
        var settings = {
            nodesDir : "wontexist"
        }

        typeRegistry.init(settings);
        typeRegistry.load("wontexist").then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            done();
        }).catch(function(e) {
            done("Loading of non-existing nodesDir should succeed");
        });
    });
    
    it('returns nothing for an unregistered type config', function() {
        typeRegistry.init({});
        typeRegistry.load("wontexist").then(function(){
            var config = typeRegistry.getNodeConfig("imaginary-shark");
            (config === null).should.be.true;
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('excludes node files listed in nodesExcludes',function(done) {
        typeRegistry.init({
            nodesExcludes: [ "TestNode1.js" ],
            nodesDir:[__dirname+"/resources/TestNode1",__dirname+"/resources/TestNode2"]
        });
        typeRegistry.load("wontexist").then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("types",["test-node-2"]);
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('returns the node configurations', function(done) {
        typeRegistry.init({
            nodesDir:[__dirname+"/resources/TestNode1",__dirname+"/resources/TestNode2"]
        });
        typeRegistry.load("wontexist").then(function() {
            var list = typeRegistry.getNodeList();
            
            var nodeConfigs = typeRegistry.getNodeConfigs();
            
            // TODO: this is brittle...
            nodeConfigs.should.equal("<script type=\"text/x-red\" data-template-name=\"test-node-1\"></script><script type=\"text/x-red\" data-help-name=\"test-node-1\"></script><style></style><script type=\"text/x-red\" data-template-name=\"test-node-2\"></script><script type=\"text/x-red\" data-help-name=\"test-node-2\"></script><style></style><script type=\"text/javascript\">RED.nodes.registerType(\"test-node-1\",{}),RED.nodes.registerType(\"test-node-2\",{});</script>");
            
            var nodeId = list[0].id;
            var nodeConfig = typeRegistry.getNodeConfig(nodeId);
            nodeConfig.should.equal("<script type=\"text/x-red\" data-template-name=\"test-node-1\"></script><script type=\"text/x-red\" data-help-name=\"test-node-1\"></script><style></style><script type=\"text/javascript\">RED.nodes.registerType('test-node-1',{});</script>");
            done();
        }).catch(function(e) {
            done(e);
        });
    });
});
