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

var NR_TEST_UTILS = require("nr-test-utils");

var loader = NR_TEST_UTILS.require("@node-red/registry/lib/loader");

var localfilesystem = NR_TEST_UTILS.require("@node-red/registry/lib/localfilesystem");
var registry = NR_TEST_UTILS.require("@node-red/registry/lib/registry");

var nodes = NR_TEST_UTILS.require("@node-red/registry");

var resourcesDir = path.resolve(path.join(__dirname,"resources","local"));

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

    describe("#load",function() {
        it("load empty set without settings available", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){ return {};}));
            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return {};}));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return false;}}});
            loader.load(true).then(function() {
                localfilesystem.getNodeFiles.called.should.be.true();
                localfilesystem.getNodeFiles.lastCall.args[0].should.be.true();
                registry.saveNodeList.called.should.be.false();
                done();
            })
        });
        it("load empty set with settings available triggers registery save", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){ return {};}));
            stubs.push(sinon.stub(registry,"saveNodeList", function(){ return {};}));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load(true).then(function() {
                registry.saveNodeList.called.should.be.true();
                done();
            }).catch(function(err) {
                done(err);
            })
        });

        it("load core node files scanned by lfs - single node single file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "version": "1.2.3",
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","node-red");
                module.should.have.property("version","1.2.3");
                module.should.have.property("nodes");
                module.nodes.should.have.property("TestNode1");
                module.nodes.TestNode1.should.have.property("id","node-red/TestNode1");
                module.nodes.TestNode1.should.have.property("module","node-red");
                module.nodes.TestNode1.should.have.property("name","TestNode1");
                module.nodes.TestNode1.should.have.property("file");
                module.nodes.TestNode1.should.have.property("template");
                module.nodes.TestNode1.should.have.property("enabled",true);
                module.nodes.TestNode1.should.have.property("loaded",true);
                module.nodes.TestNode1.should.have.property("types");
                module.nodes.TestNode1.types.should.have.a.length(1);
                module.nodes.TestNode1.types[0].should.eql('test-node-1');
                module.nodes.TestNode1.should.have.property("config");
                module.nodes.TestNode1.should.have.property("help");
                module.nodes.TestNode1.should.have.property("namespace","node-red");

                nodes.registerType.calledOnce.should.be.true();
                nodes.registerType.lastCall.args[0].should.eql('node-red/TestNode1');
                nodes.registerType.lastCall.args[1].should.eql('test-node-1');

                done();
            }).catch(function(err) {
                done(err);
            });
        });

        it("load core node files scanned by lfs - multiple nodes single file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "version": "4.5.6",
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {

                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","node-red");
                module.should.have.property("version","4.5.6");
                module.should.have.property("nodes");
                module.nodes.should.have.property("MultipleNodes1");
                module.nodes.MultipleNodes1.should.have.property("id","node-red/MultipleNodes1");
                module.nodes.MultipleNodes1.should.have.property("module","node-red");
                module.nodes.MultipleNodes1.should.have.property("name","MultipleNodes1");
                module.nodes.MultipleNodes1.should.have.property("file");
                module.nodes.MultipleNodes1.should.have.property("template");
                module.nodes.MultipleNodes1.should.have.property("enabled",true);
                module.nodes.MultipleNodes1.should.have.property("loaded",true);
                module.nodes.MultipleNodes1.should.have.property("types");
                module.nodes.MultipleNodes1.types.should.have.a.length(2);
                module.nodes.MultipleNodes1.types[0].should.eql('test-node-multiple-1a');
                module.nodes.MultipleNodes1.types[1].should.eql('test-node-multiple-1b');
                module.nodes.MultipleNodes1.should.have.property("config");
                module.nodes.MultipleNodes1.should.have.property("help");
                module.nodes.MultipleNodes1.should.have.property("namespace","node-red");

                nodes.registerType.calledTwice.should.be.true();
                nodes.registerType.firstCall.args[0].should.eql('node-red/MultipleNodes1');
                nodes.registerType.firstCall.args[1].should.eql('test-node-multiple-1a');
                nodes.registerType.secondCall.args[0].should.eql('node-red/MultipleNodes1');
                nodes.registerType.secondCall.args[1].should.eql('test-node-multiple-1b');


                done();
            }).catch(function(err) {
                done(err);
            });
        });


        it("load core node files scanned by lfs - node with promise", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "version":"2.4.6",
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {

                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","node-red");
                module.should.have.property("version","2.4.6");
                module.should.have.property("nodes");
                module.nodes.should.have.property("TestNode2");
                module.nodes.TestNode2.should.have.property("id","node-red/TestNode2");
                module.nodes.TestNode2.should.have.property("module","node-red");
                module.nodes.TestNode2.should.have.property("name","TestNode2");
                module.nodes.TestNode2.should.have.property("file");
                module.nodes.TestNode2.should.have.property("template");
                module.nodes.TestNode2.should.have.property("enabled",true);
                module.nodes.TestNode2.should.have.property("loaded",true);
                module.nodes.TestNode2.should.have.property("types");
                module.nodes.TestNode2.types.should.have.a.length(1);
                module.nodes.TestNode2.types[0].should.eql('test-node-2');
                module.nodes.TestNode2.should.have.property("config");
                module.nodes.TestNode2.should.have.property("help");
                module.nodes.TestNode2.should.have.property("namespace","node-red");
                module.nodes.TestNode2.should.not.have.property('err');

                nodes.registerType.calledOnce.should.be.true();
                nodes.registerType.lastCall.args[0].should.eql('node-red/TestNode2');
                nodes.registerType.lastCall.args[1].should.eql('test-node-2');

                done();
            }).catch(function(err) {
                done(err);
            });
        });


        it("load core node files scanned by lfs - node with rejecting promise", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "version":"1.2.3",
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","node-red");
                module.should.have.property("version","1.2.3");
                module.should.have.property("nodes");
                module.nodes.should.have.property("TestNode3");
                module.nodes.TestNode3.should.have.property("id","node-red/TestNode3");
                module.nodes.TestNode3.should.have.property("module","node-red");
                module.nodes.TestNode3.should.have.property("name","TestNode3");
                module.nodes.TestNode3.should.have.property("file");
                module.nodes.TestNode3.should.have.property("template");
                module.nodes.TestNode3.should.have.property("enabled",true);
                module.nodes.TestNode3.should.have.property("loaded",false);
                module.nodes.TestNode3.should.have.property("types");
                module.nodes.TestNode3.types.should.have.a.length(1);
                module.nodes.TestNode3.types[0].should.eql('test-node-3');
                module.nodes.TestNode3.should.have.property("config");
                module.nodes.TestNode3.should.have.property("help");
                module.nodes.TestNode3.should.have.property("namespace","node-red");
                module.nodes.TestNode3.should.have.property('err','fail');

                nodes.registerType.called.should.be.false();

                done();
            }).catch(function(err) {
                done(err);
            });
        });

        it("load core node files scanned by lfs - missing file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "version":"1.2.3",
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {
                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","node-red");
                module.should.have.property("version","1.2.3");
                module.should.have.property("nodes");
                module.nodes.should.have.property("DoesNotExist");
                module.nodes.DoesNotExist.should.have.property("id","node-red/DoesNotExist");
                module.nodes.DoesNotExist.should.have.property("module","node-red");
                module.nodes.DoesNotExist.should.have.property("name","DoesNotExist");
                module.nodes.DoesNotExist.should.have.property("file");
                module.nodes.DoesNotExist.should.have.property("template");
                module.nodes.DoesNotExist.should.have.property("enabled",true);
                module.nodes.DoesNotExist.should.have.property("loaded",false);
                module.nodes.DoesNotExist.should.have.property("types");
                module.nodes.DoesNotExist.types.should.have.a.length(0);
                module.nodes.DoesNotExist.should.not.have.property("config");
                module.nodes.DoesNotExist.should.not.have.property("help");
                module.nodes.DoesNotExist.should.not.have.property("namespace","node-red");
                module.nodes.DoesNotExist.should.have.property('err');

                nodes.registerType.called.should.be.false();

                done();
            }).catch(function(err) {
                done(err);
            });
        });

        it("load core node files scanned by lfs - missing html file", function(done) {
            stubs.push(sinon.stub(localfilesystem,"getNodeFiles", function(){
                var result = {};
                result["node-red"] = {
                    "name": "node-red",
                    "version": "1.2.3",
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            // This module isn't already loaded
            stubs.push(sinon.stub(registry,"getNodeInfo", function(){ return null; }));

            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.load().then(function(result) {

                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","node-red");
                module.should.have.property("version","1.2.3");
                module.should.have.property("nodes");
                module.nodes.should.have.property("DuffNode");
                module.nodes.DuffNode.should.have.property("id","node-red/DuffNode");
                module.nodes.DuffNode.should.have.property("module","node-red");
                module.nodes.DuffNode.should.have.property("name","DuffNode");
                module.nodes.DuffNode.should.have.property("file");
                module.nodes.DuffNode.should.have.property("template");
                module.nodes.DuffNode.should.have.property("enabled",true);
                module.nodes.DuffNode.should.have.property("loaded",false);
                module.nodes.DuffNode.should.have.property("types");
                module.nodes.DuffNode.types.should.have.a.length(0);
                module.nodes.DuffNode.should.not.have.property("config");
                module.nodes.DuffNode.should.not.have.property("help");
                module.nodes.DuffNode.should.not.have.property("namespace","node-red");
                module.nodes.DuffNode.should.have.property('err');
                module.nodes.DuffNode.err.should.endWith("DuffNode.html does not exist");

                nodes.registerType.called.should.be.false();

                done();
            }).catch(function(err) {
                done(err);
            });
        });
    });

    describe("#addModule",function() {
        it("throws error if settings unavailable", function() {
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return false;}}});
            /*jshint immed: false */
            (function(){
                loader.addModule("test-module");
            }).should.throw("Settings unavailable");
        });

        it("returns rejected error if module already loaded", function(done) {
            stubs.push(sinon.stub(registry,"getModuleInfo",function(){return{}}));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});

            loader.addModule("test-module").catch(function(err) {
                err.code.should.eql("module_already_loaded");
                done();
            });
        });
        it("returns rejected error if module not found", function(done) {
            stubs.push(sinon.stub(registry,"getModuleInfo",function(){return null}));
            stubs.push(sinon.stub(localfilesystem,"getModuleFiles",function() {
                throw new Error("failure");
            }));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.addModule("test-module").catch(function(err) {
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({nodes:nodes,log:{info:function(){},_:function(){}},settings:{available:function(){return true;}}});
            loader.addModule("TestNodeModule").then(function(result) {
                result.should.eql("a node list");

                registry.addModule.called.should.be.true();
                var module = registry.addModule.lastCall.args[0];
                module.should.have.property("name","TestNodeModule");
                module.should.have.property("version","1.2.3");
                module.should.have.property("nodes");
                module.nodes.should.have.property("TestNode1");
                module.nodes.TestNode1.should.have.property("id","TestNodeModule/TestNode1");
                module.nodes.TestNode1.should.have.property("module","TestNodeModule");
                module.nodes.TestNode1.should.have.property("name","TestNode1");
                module.nodes.TestNode1.should.have.property("file");
                module.nodes.TestNode1.should.have.property("template");
                module.nodes.TestNode1.should.have.property("enabled",true);
                module.nodes.TestNode1.should.have.property("loaded",true);
                module.nodes.TestNode1.should.have.property("types");
                module.nodes.TestNode1.types.should.have.a.length(1);
                module.nodes.TestNode1.types[0].should.eql('test-node-mod-1');
                module.nodes.TestNode1.should.have.property("config");
                module.nodes.TestNode1.should.have.property("help");
                module.nodes.TestNode1.should.have.property("namespace","TestNodeModule");
                module.nodes.TestNode1.should.not.have.property('err');

                nodes.registerType.calledOnce.should.be.true();
                done();
            }).catch(function(err) {
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
            stubs.push(sinon.stub(registry,"addModule", function(){ return }));
            stubs.push(sinon.stub(nodes,"registerType"));
            loader.init({log:{"_":function(){},warn:function(){}},nodes:nodes,version: function() { return "0.12.0"}, settings:{available:function(){return true;}}});
            loader.addModule("TestNodeModule").then(function(result) {
                result.should.eql("a node list");
                registry.addModule.called.should.be.false();
                nodes.registerType.called.should.be.false();
                done();
            }).catch(function(err) {
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
            }).catch(function(err) {
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
            }).catch(function(err) {
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
