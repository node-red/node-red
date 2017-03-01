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
var when = require("when");
var sinon = require("sinon");
var path = require("path");
var fs = require("fs");

var loader = require("../../../../../red/runtime/nodes/registry/loader");

var localfilesystem = require("../../../../../red/runtime/nodes/registry/localfilesystem");
var registry = require("../../../../../red/runtime/nodes/registry/registry");

var nodes = require("../../../../../red/runtime/nodes/registry");

var resourcesDir = path.resolve(path.join(__dirname,"..","resources","local"));

describe("red/nodes/registry/loader",function() {
    var stubs = [];
    before(function() {
        sinon.stub(localfilesystem,"init");
    });
    after(function() {
        localfilesystem.init.restore();
    });
    afterEach(function() {
        while(stubs.length) {
            stubs.pop().restore();
        }
    })
    describe("#init",function() {
        it("init",function() {
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){},log:{info:function(){},_:function(){}}}});
            localfilesystem.init.called.should.be.true();
        });
    });

    describe("#load",function() {
        it("load empty set without settings available", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){ return {};}));
            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return {};}));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return false;}}});
            loader.load("foo",true).then(function() {
                localfilesystem.getNodeFiles.called.should.be.true();
                localfilesystem.getNodeFiles.lastCall.args[0].should.eql('foo');
                localfilesystem.getNodeFiles.lastCall.args[1].should.be.true();
                registry.saveNodeList.called.should.be.false();
                done();
            })
        });
        it("load empty set with settings available triggers registery save", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){ return {};}));
            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return {};}));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load("foo",true).then(function() {
                registry.saveNodeList.called.should.be.true();
                done();
            }).otherwise(function(err) {
                done(err);
            })
        });

        it("load core node files scanned by lfs - single node single file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "nodes": {
                        "TestNode1": {
                            "file": path.join(resourcesDir,"TestNode1","TestNode1.js"),
                            "module": "node-red",
                            "name": "TestNode1"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addNodeSet.called.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("node-red/TestNode1");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"node-red/TestNode1");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"node-red");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',undefined);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(1);
                registry.addNodeSet.lastCall.args[1].types[0].should.eql('test-node-1');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('namespace','node-red');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('err');

                nodes.registerType.calledOnce.should.be.true();
                nodes.registerType.lastCall.args[0].should.eql('node-red/TestNode1');
                nodes.registerType.lastCall.args[1].should.eql('test-node-1');

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });

        it("load core node files scanned by lfs - multiple nodes single file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "nodes": {
                        "MultipleNodes1": {
                            "file": path.join(resourcesDir,"MultipleNodes1","MultipleNodes1.js"),
                            "module": "node-red",
                            "name": "MultipleNodes1"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addNodeSet.called.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("node-red/MultipleNodes1");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"node-red/MultipleNodes1");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"node-red");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',undefined);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(2);
                registry.addNodeSet.lastCall.args[1].types[0].should.eql('test-node-multiple-1a');
                registry.addNodeSet.lastCall.args[1].types[1].should.eql('test-node-multiple-1b');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('namespace','node-red');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('err');

                nodes.registerType.calledTwice.should.be.true();
                nodes.registerType.firstCall.args[0].should.eql('node-red/MultipleNodes1');
                nodes.registerType.firstCall.args[1].should.eql('test-node-multiple-1a');
                nodes.registerType.secondCall.args[0].should.eql('node-red/MultipleNodes1');
                nodes.registerType.secondCall.args[1].should.eql('test-node-multiple-1b');

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });


        it("load core node files scanned by lfs - node with promise", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "nodes": {
                        "TestNode2": {
                            "file": path.join(resourcesDir,"TestNode2","TestNode2.js"),
                            "module": "node-red",
                            "name": "TestNode2"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addNodeSet.called.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("node-red/TestNode2");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"node-red/TestNode2");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"node-red");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',undefined);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(1);
                registry.addNodeSet.lastCall.args[1].types[0].should.eql('test-node-2');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('namespace','node-red');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('err');

                nodes.registerType.calledOnce.should.be.true();
                nodes.registerType.lastCall.args[0].should.eql('node-red/TestNode2');
                nodes.registerType.lastCall.args[1].should.eql('test-node-2');

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });


        it("load core node files scanned by lfs - node with rejecting promise", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "nodes": {
                        "TestNode3": {
                            "file": path.join(resourcesDir,"TestNode3","TestNode3.js"),
                            "module": "node-red",
                            "name": "TestNode3"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addNodeSet.called.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("node-red/TestNode3");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"node-red/TestNode3");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"node-red");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',false);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',undefined);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(1);
                registry.addNodeSet.lastCall.args[1].types[0].should.eql('test-node-3');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('namespace','node-red');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('err','fail');

                nodes.registerType.calledOnce.should.be.false();

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });

        it("load core node files scanned by lfs - missing file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "nodes": {
                        "DoesNotExist": {
                            "file": path.join(resourcesDir,"doesnotexist"),
                            "module": "node-red",
                            "name": "DoesNotExist"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addNodeSet.called.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("node-red/DoesNotExist");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"node-red/DoesNotExist");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"node-red");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',false);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',undefined);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(0);
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('namespace','node-red');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('err');

                nodes.registerType.calledOnce.should.be.false();

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });

        it("load core node files scanned by lfs - missing html file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "nodes": {
                        "DuffNode": {
                            "file": path.join(resourcesDir,"DuffNode","DuffNode.js"),
                            "module": "node-red",
                            "name": "DuffNode"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addNodeSet.called.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("node-red/DuffNode");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"node-red/DuffNode");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"node-red");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',false);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',undefined);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(0);
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('namespace','node-red');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('err');
                registry.addNodeSet.lastCall.args[1].err.should.endWith("DuffNode.html does not exist");

                nodes.registerType.calledOnce.should.be.false();

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });
    });

    describe("#addModule",function() {
        it("throws error if settings unavailable", function() {
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return false;}}});
            /*jshint immed: false */
            (function(){
                loader.addModule("test-module");
            }).should.throw("Settings unavailable");
        });

        it("returns rejected error if module already loaded", function(done) {
            stubs.push(sinon.stub(registry,"getModuleInfo",function(){return{}}));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});

            loader.addModule("test-module").otherwise(function(err) {
                err.code.should.eql("module_already_loaded");
                done();
            });
        });
        it("returns rejected error if module not found", function(done) {
            stubs.push(sinon.stub(registry,"getModuleInfo",function(){return null}));
            stubs.push(sinon.stub(localfilesystem,"getModuleFiles",function() {
                throw new Error("failure");
            }));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.addModule("test-module").otherwise(function(err) {
                err.message.should.eql("failure");
                done();
            });

        });

        it("loads module by name", function(done) {
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));
            stubs.push(sinon.stub(registry,"getModuleInfo",function(){ return null; }));
            stubs.push(sinon.stub(localfilesystem,"getModuleFiles", function(){
                var result = {};
                result["TestNodeModule"] = {
                    "name": "TestNodeModule",
                    "version": "1.2.3",
                    "nodes": {
                        "TestNode1": {
                            "file": path.join(resourcesDir,"TestNodeModule","node_modules","TestNodeModule","TestNodeModule.js"),
                            "module": "TestNodeModule",
                            "name": "TestNode1",
                            "version": "1.2.3"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return "a node list" }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.addModule("TestNodeModule").then(function(result) {
                result.should.eql("a node list");
                registry.addNodeSet.calledOnce.should.be.true();
                registry.addNodeSet.lastCall.args[0].should.eql("TestNodeModule/TestNode1");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('id',"TestNodeModule/TestNode1");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('module',"TestNodeModule");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('enabled',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('loaded',true);
                registry.addNodeSet.lastCall.args[1].should.have.a.property('version',"1.2.3");
                registry.addNodeSet.lastCall.args[1].should.have.a.property('types');
                registry.addNodeSet.lastCall.args[1].types.should.have.a.length(1);
                registry.addNodeSet.lastCall.args[1].types[0].should.eql('test-node-mod-1');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('config');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('help');
                registry.addNodeSet.lastCall.args[1].should.have.a.property('namespace','TestNodeModule');
                registry.addNodeSet.lastCall.args[1].should.not.have.a.property('err');

                nodes.registerType.calledOnce.should.be.true();
                done();
            }).otherwise(function(err) {
                done(err);
            });
        });

        it("skips module that fails version check", function(done) {
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));
            stubs.push(sinon.stub(registry,"getModuleInfo",function(){ return null; }));
            stubs.push(sinon.stub(localfilesystem,"getModuleFiles", function(){
                var result = {};
                result["TestNodeModule"] = {
                    "name": "TestNodeModule",
                    "version": "1.2.3",
                    "redVersion":"999.0.0",
                    "nodes": {
                        "TestNode1": {
                            "file": path.join(resourcesDir,"TestNodeModule","node_modules","TestNodeModule","TestNodeModule.js"),
                            "module": "TestNodeModule",
                            "name": "TestNode1",
                            "version": "1.2.3"
                        }
                    }
                };
                return result;
            }));

            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return "a node list" }));
            stubs.push(sinon.stub(registry,"addNodeSet", function(){ return }));
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({log:{"_":function(){},warn:function(){}},nodes:nodes,i18n:{defaultLang:"en-US"},events:{on:function(){},removeListener:function(){}},version: function() { return "0.12.0"}, settings:{available:function(){return true;}}});
            loader.addModule("TestNodeModule").then(function(result) {
                result.should.eql("a node list");
                registry.addNodeSet.called.should.be.false();
                nodes.registerType.called.should.be.false();
                done();
            }).otherwise(function(err) {
                done(err);
            });
        });

        it.skip('registers a message catalog');


    });
    describe("#loadNodeSet",function() {
        it("no-ops the load if node is not enabled", function(done) {
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.loadNodeSet({
                "file": path.join(resourcesDir,"TestNode1","TestNode1.js"),
                "module": "node-red",
                "name": "TestNode1",
                "enabled": false
            }).then(function(node) {
                node.enabled.should.be.false();
                nodes.registerType.called.should.be.false();
                done();
            }).otherwise(function(err) {
                done(err);
            });
        });

        it("handles node that errors on require", function(done) {
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.loadNodeSet({
                "file": path.join(resourcesDir,"TestNode4","TestNode4.js"),
                "module": "node-red",
                "name": "TestNode4",
                "enabled": true
            }).then(function(node) {
                node.enabled.should.be.true();
                nodes.registerType.called.should.be.false();
                node.should.have.property('err');
                node.err.toString().should.eql("Error: fail to require (line:1)");

                done();
            }).otherwise(function(err) {
                done(err);
            });
        });
    });
    describe("#getNodeHelp",function() {
        it("returns preloaded help", function() {
            loader.getNodeHelp({
                help:{
                    en:"foo"
                }
            },"en").should.eql("foo");
        });
        it("loads help, caching result", function() {
            stubs.push(sinon.stub(fs,"readFileSync", function(path) {
                return 'bar';
            }))
            var node = {
                template: "/tmp/node/directory/file.html",
                help:{
                    en:"foo"
                }
            };
            loader.getNodeHelp(node,"fr").should.eql("bar");
            node.help['fr'].should.eql("bar");
            fs.readFileSync.calledOnce.should.be.true();
            fs.readFileSync.lastCall.args[0].should.eql(path.normalize("/tmp/node/directory/locales/fr/file.html"));
            loader.getNodeHelp(node,"fr").should.eql("bar");
            fs.readFileSync.calledOnce.should.be.true();
        });
        it("loads help, defaulting to en-US content", function() {
            stubs.push(sinon.stub(fs,"readFileSync", function(path) {
                throw new Error("not found");
            }))
            var node = {
                template: "/tmp/node/directory/file.html",
                help:{}
            };
            node.help['en-US'] = 'foo';

            loader.getNodeHelp(node,"fr").should.eql("foo");
            node.help['fr'].should.eql("foo");
            fs.readFileSync.calledOnce.should.be.true();
            fs.readFileSync.lastCall.args[0].should.eql(path.normalize("/tmp/node/directory/locales/fr/file.html"));
            loader.getNodeHelp(node,"fr").should.eql("foo");
            fs.readFileSync.calledOnce.should.be.true();
        });
        it("loads help, defaulting to en-US content for extra nodes", function() {
            stubs.push(sinon.stub(fs,"readFileSync", function(path) {
                if (path.indexOf("en-US") >= 0) {
                    return 'bar';
                }
                throw new Error("not found");
            }));
            var node = {
                template: "/tmp/node/directory/file.html",
                help:{}
            };
            delete node.help['en-US'];

            loader.getNodeHelp(node,"fr").should.eql("bar");
            node.help['fr'].should.eql("bar");
            fs.readFileSync.calledTwice.should.be.true();
            fs.readFileSync.firstCall.args[0].should.eql(path.normalize("/tmp/node/directory/locales/fr/file.html"));
            fs.readFileSync.lastCall.args[0].should.eql(path.normalize("/tmp/node/directory/locales/en-US/file.html"));
            loader.getNodeHelp(node,"fr").should.eql("bar");
            fs.readFileSync.calledTwice.should.be.true();
        });
        it("fails to load en-US help content", function() {
            stubs.push(sinon.stub(fs,"readFileSync", function(path) {
                throw new Error("not found");
            }));
            var node = {
                template: "/tmp/node/directory/file.html",
                help:{}
            };
            delete node.help['en-US'];

            should.not.exist(loader.getNodeHelp(node,"en-US"));
            should.not.exist(node.help['en-US']);
            fs.readFileSync.calledTwice.should.be.true();
            fs.readFileSync.firstCall.args[0].should.eql(path.normalize("/tmp/node/directory/locales/en-US/file.html"));
            fs.readFileSync.lastCall.args[0].should.eql(path.normalize("/tmp/node/directory/locales/en/file.html"));
            should.not.exist(loader.getNodeHelp(node,"en-US"));
            fs.readFileSync.callCount.should.eql(4);
        });

    });
});
