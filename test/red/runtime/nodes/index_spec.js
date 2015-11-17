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
var fs = require('fs-extra');
var path = require('path');
var when = require("when");
var sinon = require('sinon');

var index = require("../../../../red/runtime/nodes/index");
var flows = require("../../../../red/runtime/nodes/flows");
var registry = require("../../../../red/runtime/nodes/registry");

describe("red/nodes/index", function() {
    before(function() {
        sinon.stub(flows,"startFlows");
        process.env.NODE_RED_HOME = path.resolve(path.join(__dirname,"..","..","..",".."))
    });
    after(function() {
        flows.startFlows.restore();
        delete process.env.NODE_RED_HOME;
    });

    afterEach(function() {
        index.clearRegistry();
    });

    var testFlows = [{"type":"test","id":"tab1","label":"Sheet 1"}];
    var storage = {
            getFlows: function() {
                return when(testFlows);
            },
            getCredentials: function() {
                return when({"tab1":{"b":1,"c":2}});
            },
            saveFlows: function(conf) {
                should.deepEqual(testFlows, conf);
                return when();
            },
            saveCredentials: function(creds) {
                return when(true);
            }
    };

    var settings = {
        available: function() { return false }
    };

    var runtime = {
        settings: settings,
        storage: storage
    };

    function TestNode(n) {
        index.createNode(this, n);
        var node = this;
        this.on("log", function() {
            // do nothing
        });
    }

   it('nodes are initialised with credentials',function(done) {
        index.init(runtime);
        index.registerType('test', TestNode);
        index.loadFlows().then(function() {
            var testnode = new TestNode({id:'tab1',type:'test',name:'barney'});
            testnode.credentials.should.have.property('b',1);
            testnode.credentials.should.have.property('c',2);
            done();
        }).otherwise(function(err) {
            done(err);
        });
    });

   it('flows should be initialised',function(done) {
        index.init(runtime);
        index.loadFlows().then(function() {
            should.deepEqual(testFlows, index.getFlows());
            done();
        }).otherwise(function(err) {
            done(err);
        });

    });

   describe("registerType should register credentials definition", function() {
       var http = require('http');
       var express = require('express');
       var app = express();
       var runtime = require("../../../../red/runtime");
       var credentials = require("../../../../red/runtime/nodes/credentials");
       var localfilesystem = require("../../../../red/runtime/storage/localfilesystem");
       var RED = require("../../../../red/red.js");

       var userDir = path.join(__dirname,".testUserHome");
       before(function(done) {
           fs.remove(userDir,function(err) {
               fs.mkdir(userDir,function() {
                   sinon.stub(index, 'load', function() {
                       return when.promise(function(resolve,reject){
                           resolve([]);
                       });
                   });
                   sinon.stub(localfilesystem, 'getCredentials', function() {
                        return when.promise(function(resolve,reject) {
                               resolve({"tab1":{"b":1,"c":2}});
                        });
                   }) ;
                   RED.init(http.createServer(function(req,res){app(req,res)}),
                            {userDir: userDir});
                   runtime.start().then(function () {
                       done();
                    });
               });
           });
       });

       after(function(done) {
           fs.remove(userDir,function() {;
               runtime.stop().then(function() {
                   index.load.restore();
                   localfilesystem.getCredentials.restore();
                   done();
               });
           });
       });

       it(': definition defined',function() {
           index.registerType('test', TestNode, {
               credentials: {
                   foo: {type:"test"}
               }
           });
           var testnode = new TestNode({id:'tab1',type:'test',name:'barney', '_alias':'tab1'});
           index.getCredentialDefinition("test").should.have.property('foo');
       });

   });

   describe('allows nodes to be added/removed/enabled/disabled from the registry', function() {
       var randomNodeInfo = {id:"5678",types:["random"]};

       beforeEach(function() {
           sinon.stub(registry,"getNodeInfo",function(id) {
               if (id == "test") {
                   return {id:"1234",types:["test"]};
               } else if (id == "doesnotexist") {
                   return null;
               } else {
                   return randomNodeInfo;
               }
           });
           sinon.stub(registry,"disableNode",function(id) {
               return randomNodeInfo;
           });
       });
       afterEach(function() {
           registry.getNodeInfo.restore();
           registry.disableNode.restore();
       });

       it(': allows an unused node type to be disabled',function(done) {
            index.init(runtime);
            index.registerType('test', TestNode);
            index.loadFlows().then(function() {
                var info = index.disableNode("5678");
                registry.disableNode.calledOnce.should.be.true;
                registry.disableNode.calledWith("5678").should.be.true;
                info.should.eql(randomNodeInfo);
                done();
            }).otherwise(function(err) {
                done(err);
            });
       });

       it(': prevents disabling a node type that is in use',function(done) {
            index.init(runtime);
            index.registerType('test', TestNode);
            index.loadFlows().then(function() {
                /*jshint immed: false */
                (function() {
                    index.disabledNode("test");
                }).should.throw();

                done();
            }).otherwise(function(err) {
                done(err);
            });
       });

       it(': prevents disabling a node type that is unknown',function(done) {
            index.init(runtime);
            index.registerType('test', TestNode);
            index.loadFlows().then(function() {
                /*jshint immed: false */
                (function() {
                    index.disableNode("doesnotexist");
                }).should.throw();

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });
    });

   describe('allows modules to be removed from the registry', function() {
       var registry = require("../../../../red/runtime/nodes/registry");
       var randomNodeInfo = {id:"5678",types:["random"]};
       var randomModuleInfo = {
          name:"random",
          nodes: [randomNodeInfo]
        };

       before(function() {
           sinon.stub(registry,"getNodeInfo",function(id) {
               if (id == "node-red/foo") {
                   return {id:"1234",types:["test"]};
               } else if (id == "doesnotexist") {
                   return null;
               } else {
                   return randomNodeInfo;
               }
           });
           sinon.stub(registry,"getModuleInfo",function(module) {
               if (module == "node-red") {
                  return {nodes:[{name:"foo"}]};
               } else if (module == "doesnotexist") {
                   return null;
               } else {
                  return randomModuleInfo;
               }
           });
           sinon.stub(registry,"removeModule",function(id) {
               return randomModuleInfo;
           });
       });
       after(function() {
           registry.getNodeInfo.restore();
           registry.getModuleInfo.restore();
           registry.removeModule.restore();
       });

       it(': prevents removing a module that is in use',function(done) {
            index.init(runtime);
            index.registerType('test', TestNode);
            index.loadFlows().then(function() {
                /*jshint immed: false */
                (function() {
                    index.removeModule("node-red");
                }).should.throw();

                done();
            }).otherwise(function(err) {
                done(err);
            });
       });

       it(': prevents removing a module that is unknown',function(done) {
            index.init(runtime);
            index.registerType('test', TestNode);
            index.loadFlows().then(function() {
                /*jshint immed: false */
                (function() {
                    index.removeModule("doesnotexist");
                }).should.throw();

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });
    });
});
