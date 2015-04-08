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
var when = require("when");
var sinon = require("sinon");

var typeRegistry = require("../../../../red/nodes/registry/registry");

describe("red/nodes/registry/registry",function() {
    
    beforeEach(function() {
        typeRegistry.clear();
    });
    
    function stubSettings(s,available,initialConfig) {
        s.available =  function() {return available;};
        s.set = function(s,v) { return when.resolve();};
        s.get = function(s) { return initialConfig;};
        return s;
    }
    
    var settings = stubSettings({},false,null);
    var settingsWithStorageAndInitialConfig = stubSettings({},true,{"node-red":{module:"testModule",name:"testName",version:"testVersion",nodes:{"node":{id:"node-red/testName",name:"test",types:["a","b"],enabled:true}}}});

    var testNodeSet1 = {
        id: "test-module/test-name",
        module: "test-module",
        name: "test-name",
        enabled: true,
        loaded: false,
        types: [ "test-a","test-b"]
    };
    
    var testNodeSet2 = {
        id: "test-module/test-name-2",
        module: "test-module",
        name: "test-name-2",
        enabled: true,
        loaded: false,
        types: [ "test-c","test-d"]
    };
    var testNodeSet2WithError = {
        id: "test-module/test-name-2",
        module: "test-module",
        name: "test-name-2",
        enabled: true,
        loaded: false,
        err: "I have an error",
        types: [ "test-c","test-d"]
    };
    
    
    
    
    describe('#init', function() {
        it('loads initial config', function(done) {
            typeRegistry.init(settingsWithStorageAndInitialConfig);
            typeRegistry.getNodeList().should.have.lengthOf(1);
            done();
        });
        
        it('migrates legacy format', function(done) {
            var legacySettings = {
                available: function() { return true; },
                set: sinon.stub().returns(when.resolve()),
                get: function() { return {
                    "123": {
                        "name": "72-sentiment.js",
                        "types": [
                            "sentiment"
                        ],
                        "enabled": true
                    },
                    "456": {
                        "name": "20-inject.js",
                        "types": [
                            "inject"
                        ],
                        "enabled": true
                    },
                    "789": {
                        "name": "testModule:a-module.js",
                        "types": [
                            "example"
                        ],
                        "enabled":true,
                        "module":"testModule"
                    }
                 }}
            };
            var expected = JSON.parse('{"node-red":{"name":"node-red","nodes":{"sentiment":{"name":"sentiment","types":["sentiment"],"enabled":true,"module":"node-red"},"inject":{"name":"inject","types":["inject"],"enabled":true,"module":"node-red"}}},"testModule":{"name":"testModule","nodes":{"a-module.js":{"name":"a-module.js","types":["example"],"enabled":true,"module":"testModule"}}}}');
            typeRegistry.init(legacySettings);
            legacySettings.set.calledOnce.should.be.true;
            legacySettings.set.args[0][1].should.eql(expected);
            done();
        });
    });
    
    
    describe('#addNodeSet', function() {
       it('adds a node set for an unknown module', function() {
           
           typeRegistry.init(settings);
           
           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});
           
           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");
           
           typeRegistry.getNodeList().should.have.lengthOf(1);
           var moduleList = typeRegistry.getModuleList();
           moduleList.should.have.a.property("test-module");
           moduleList["test-module"].should.have.a.property("name","test-module");
           moduleList["test-module"].should.have.a.property("version","0.0.1");
           moduleList["test-module"].should.have.a.property("nodes");
           moduleList["test-module"].nodes.should.have.a.property("test-name");
           
           moduleList["test-module"].nodes["test-name"].should.eql({
                   id: 'test-module/test-name',
                   module: 'test-module',
                   name: 'test-name',
                   enabled: true,
                   loaded: false,
                   types: [ 'test-a', 'test-b' ]
           });
               
       });
       
       it('adds a node set to an existing module', function() {
           
           typeRegistry.init(settings);
           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});
           
           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");
           
           typeRegistry.getNodeList().should.have.lengthOf(1);
           var moduleList = typeRegistry.getModuleList();
           Object.keys(moduleList).should.have.a.lengthOf(1);
           moduleList.should.have.a.property("test-module");
           moduleList["test-module"].should.have.a.property("name","test-module");
           moduleList["test-module"].should.have.a.property("version","0.0.1");
           moduleList["test-module"].should.have.a.property("nodes");
           
           Object.keys(moduleList["test-module"].nodes).should.have.a.lengthOf(1);
           moduleList["test-module"].nodes.should.have.a.property("test-name");

           
           typeRegistry.addNodeSet("test-module/test-name-2",testNodeSet2);
           
           typeRegistry.getNodeList().should.have.lengthOf(2);
           moduleList = typeRegistry.getModuleList();
           Object.keys(moduleList).should.have.a.lengthOf(1);
           Object.keys(moduleList["test-module"].nodes).should.have.a.lengthOf(2);
           moduleList["test-module"].nodes.should.have.a.property("test-name");
           moduleList["test-module"].nodes.should.have.a.property("test-name-2");
       });
       
       it('doesnt add node set types if node set has an error', function() {
           typeRegistry.init(settings);
           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});
           
           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");
           
           typeRegistry.getTypeId("test-a").should.eql("test-module/test-name");
           
           should.not.exist(typeRegistry.getTypeId("test-c"));
           
           typeRegistry.addNodeSet("test-module/test-name-2",testNodeSet2WithError, "0.0.1");
           
           should.not.exist(typeRegistry.getTypeId("test-c"));
         });   
    });
    
    describe("#enableNodeSet", function() {
        it('throws error if settings unavailable', function() {
            typeRegistry.init(settings);
            /*jshint immed: false */
            (function(){
                typeRegistry.enableNodeSet("test-module/test-name");
            }).should.throw("Settings unavailable");
        });
        
        it('throws error if module unknown', function() {
            typeRegistry.init(settingsWithStorageAndInitialConfig);
            /*jshint immed: false */
            (function(){
                typeRegistry.enableNodeSet("test-module/unknown");
            }).should.throw("Unrecognised id: test-module/unknown");
        });
        
    });
    
    describe('#getNodeConfig', function() {
        it('returns nothing for an unregistered type config', function(done) {
            typeRegistry.init(settings);
            var config = typeRegistry.getNodeConfig("imaginary-shark");
            (config === null).should.be.true;
            done();
        });
    });
    
});
