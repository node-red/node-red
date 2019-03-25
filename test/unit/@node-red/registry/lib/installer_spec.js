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
var sinon = require("sinon");
var when = require("when");
var path = require("path");
var fs = require('fs');
var EventEmitter = require('events');

var NR_TEST_UTILS = require("nr-test-utils");

var installer = NR_TEST_UTILS.require("@node-red/registry/lib/installer");
var registry = NR_TEST_UTILS.require("@node-red/registry/lib/index");
var typeRegistry = NR_TEST_UTILS.require("@node-red/registry/lib/registry");

describe('nodes/registry/installer', function() {

    var mockLog = {
        log: sinon.stub(),
        debug: sinon.stub(),
        trace: sinon.stub(),
        warn: sinon.stub(),
        info: sinon.stub(),
        metric: sinon.stub(),
        _: function() { return "abc"}
    }

    beforeEach(function() {
        installer.init({log:mockLog, settings:{}, events: new EventEmitter(), exec: {
            run: function() {
                return Promise.resolve("");
            }
        }});
    });
    function initInstaller(execResult) {
        installer.init({log:mockLog, settings:{}, events: new EventEmitter(), exec: {
            run: function() {
                return execResult;
            }
        }});
    }
    afterEach(function() {
        if (registry.addModule.restore) {
            registry.addModule.restore();
        }
        if (registry.removeModule.restore) {
            registry.removeModule.restore();
        }
        if (typeRegistry.removeModule.restore) {
            typeRegistry.removeModule.restore();
        }
        if (registry.getModuleInfo.restore) {
            registry.getModuleInfo.restore();
        }
        if (typeRegistry.getModuleInfo.restore) {
            typeRegistry.getModuleInfo.restore();
        }

        if (require('fs').statSync.restore) {
            require('fs').statSync.restore();
        }

    });

    describe("installs module", function() {
        it("rejects when npm returns a 404", function(done) {
            var res = {
                code: 1,
                stdout:"",
                stderr:" 404  this_wont_exist"
            }
            var p = Promise.reject(res);
            p.catch((err)=>{});
            initInstaller(p)
            installer.installModule("this_wont_exist").catch(function(err) {
                err.should.have.property("code",404);
                done();
            });
        });
        it("rejects when npm does not find specified version", function(done) {
            var res = {
                code: 1,
                stdout:"",
                stderr:" version not found: this_wont_exist@0.1.2"
            }
            var p = Promise.reject(res);
            p.catch((err)=>{});
            initInstaller(p)
            sinon.stub(typeRegistry,"getModuleInfo", function() {
                return {
                    version: "0.1.1"
                }
            });
            installer.installModule("this_wont_exist","0.1.2").catch(function(err) {
                err.code.should.be.eql(404);
                done();
            });
        });
        it("rejects when update requested to existing version", function(done) {
            sinon.stub(typeRegistry,"getModuleInfo", function() {
                return {
                    version: "0.1.1"
                }
            });
            installer.installModule("this_wont_exist","0.1.1").catch(function(err) {
                err.code.should.be.eql('module_already_loaded');
                done();
            });
        });
        it("rejects with generic error", function(done) {
            var res = {
                code: 1,
                stdout:"",
                stderr:" kaboom!"
            }
            var p = Promise.reject(res);
            p.catch((err)=>{});
            initInstaller(p)
            installer.installModule("this_wont_exist").then(function() {
                done(new Error("Unexpected success"));
            }).catch(function(err) {
                done();
            });
        });
        it("succeeds when module is found", function(done) {
            var nodeInfo = {nodes:{module:"foo",types:["a"]}};

            var res = {
                code: 0,
                stdout:"",
                stderr:""
            }
            var p = Promise.resolve(res);
            p.catch((err)=>{});
            initInstaller(p)

            var addModule = sinon.stub(registry,"addModule",function(md) {
                return when.resolve(nodeInfo);
            });

            installer.installModule("this_wont_exist").then(function(info) {
                info.should.eql(nodeInfo);
                // commsMessages.should.have.length(1);
                // commsMessages[0].topic.should.equal("node/added");
                // commsMessages[0].msg.should.eql(nodeInfo.nodes);
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it("rejects when non-existant path is provided", function(done) {
            this.timeout(20000);
            var resourcesDir = path.resolve(path.join(__dirname,"resources","local","TestNodeModule","node_modules","NonExistant"));
            installer.installModule(resourcesDir).then(function() {
                done(new Error("Unexpected success"));
            }).catch(function(err) {
                if (err.hasOwnProperty("code")) {
                    err.code.should.eql(404);
                    done();
                }
                else {
                    console.log("ERRROR::"+err.toString()+"::");
                    err.toString().should.eql("Error: Install failed");
                    done();
                }
            });
        });
        it("succeeds when path is valid node-red module", function(done) {
            var nodeInfo = {nodes:{module:"foo",types:["a"]}};
            var addModule = sinon.stub(registry,"addModule",function(md) {
                return when.resolve(nodeInfo);
            });
            var resourcesDir = path.resolve(path.join(__dirname,"resources","local","TestNodeModule","node_modules","TestNodeModule"));

            var res = {
                code: 0,
                stdout:"",
                stderr:""
            }
            var p = Promise.resolve(res);
            p.catch((err)=>{});
            initInstaller(p)
            installer.installModule(resourcesDir).then(function(info) {
                info.should.eql(nodeInfo);
                done();
            }).catch(function(err) {
                done(err);
            });
        });

    });
    describe("uninstalls module", function() {
        it("rejects invalid module names", function(done) {
            var promises = [];
            promises.push(installer.uninstallModule("this_wont_exist "));
            promises.push(installer.uninstallModule("this_wont_exist;no_it_really_wont"));
            when.settle(promises).then(function(results) {
                results[0].state.should.be.eql("rejected");
                results[1].state.should.be.eql("rejected");
                done();
            });
        });

        it("rejects with generic error", function(done) {
            var nodeInfo = [{module:"foo",types:["a"]}];
            var removeModule = sinon.stub(registry,"removeModule",function(md) {
                return when.resolve(nodeInfo);
            });
            var res = {
                code: 1,
                stdout:"",
                stderr:"error"
            }
            var p = Promise.reject(res);
            p.catch((err)=>{});
            initInstaller(p)

            installer.uninstallModule("this_wont_exist").then(function() {
                done(new Error("Unexpected success"));
            }).catch(function(err) {
                done();
            });
        });
        it("succeeds when module is found", function(done) {
            var nodeInfo = [{module:"foo",types:["a"]}];
            var removeModule = sinon.stub(typeRegistry,"removeModule",function(md) {
                return nodeInfo;
            });
            var getModuleInfo = sinon.stub(registry,"getModuleInfo",function(md) {
                return {nodes:[]};
            });
            var res = {
                code: 0,
                stdout:"",
                stderr:""
            }
            var p = Promise.resolve(res);
            p.catch((err)=>{});
            initInstaller(p)

            sinon.stub(fs,"statSync", function(fn) { return {}; });

            installer.uninstallModule("this_wont_exist").then(function(info) {
                info.should.eql(nodeInfo);
                // commsMessages.should.have.length(1);
                // commsMessages[0].topic.should.equal("node/removed");
                // commsMessages[0].msg.should.eql(nodeInfo);
                done();
            }).catch(function(err) {
                done(err);
            });
        });
    });
});
