/**
 * Copyright 2014, 2015 IBM Corp.
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

var child_process = require('child_process');
var installer = require("../../../../../red/runtime/nodes/registry/installer");
var registry = require("../../../../../red/runtime/nodes/registry/index");
var typeRegistry = require("../../../../../red/runtime/nodes/registry/registry");

describe('nodes/registry/installer', function() {

    before(function() {
        installer.init({});
    });
    afterEach(function() {
        if (child_process.execFile.restore) {
            child_process.execFile.restore();
        }
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

        if (require('fs').statSync.restore) {
            require('fs').statSync.restore();
        }

    });

    describe("installs module", function() {
        it("rejects when npm returns a 404", function(done) {
            sinon.stub(child_process,"execFile",function(cmd,args,opt,cb) {
                cb(new Error(),""," 404  this_wont_exist");
            });

            installer.installModule("this_wont_exist").otherwise(function(err) {
                err.code.should.be.eql(404);
                done();
            });
        });
        it("rejects with generic error", function(done) {
            sinon.stub(child_process,"execFile",function(cmd,args,opt,cb) {
                cb(new Error("test_error"),"","");
            });

            installer.installModule("this_wont_exist").then(function() {
                done(new Error("Unexpected success"));
            }).otherwise(function(err) {
                done();
            });
        });
        it("succeeds when module is found", function(done) {
            var nodeInfo = {nodes:{module:"foo",types:["a"]}};
            sinon.stub(child_process,"execFile",function(cmd,args,opt,cb) {
                cb(null,"","");
            });
            var addModule = sinon.stub(registry,"addModule",function(md) {
                return when.resolve(nodeInfo);
            });

            installer.installModule("this_wont_exist").then(function(info) {
                info.should.eql(nodeInfo);
                // commsMessages.should.have.length(1);
                // commsMessages[0].topic.should.equal("node/added");
                // commsMessages[0].msg.should.eql(nodeInfo.nodes);
                done();
            }).otherwise(function(err) {
                done(err);
            });
        });
        it("rejects when non-existant path is provided", function(done) {
            var resourcesDir = path.resolve(path.join(__dirname,"..","resources","local","TestNodeModule","node_modules","NonExistant"));
            installer.installModule(resourcesDir).then(function() {
                done(new Error("Unexpected success"));
            }).otherwise(function(err) {
                err.code.should.eql(404);
                done();
            });
        });
        it("succeeds when path is valid node-red module", function(done) {
            var nodeInfo = {nodes:{module:"foo",types:["a"]}};
            var addModule = sinon.stub(registry,"addModule",function(md) {
                return when.resolve(nodeInfo);
            });
            var resourcesDir = path.resolve(path.join(__dirname,"..","resources","local","TestNodeModule","node_modules","TestNodeModule"));
            sinon.stub(child_process,"execFile",function(cmd,args,opt,cb) {
                cb(null,"","");
            });
            installer.installModule(resourcesDir).then(function(info) {
                info.should.eql(nodeInfo);
                done();
            }).otherwise(function(err) {
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
            sinon.stub(child_process,"execFile",function(cmd,args,opt,cb) {
                cb(new Error("test_error"),"","");
            });

            installer.uninstallModule("this_wont_exist").then(function() {
                done(new Error("Unexpected success"));
            }).otherwise(function(err) {
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
            sinon.stub(child_process,"execFile",function(cmd,args,opt,cb) {
                cb(null,"","");
            });

            sinon.stub(fs,"statSync", function(fn) { return {}; });

            installer.uninstallModule("this_wont_exist").then(function(info) {
                info.should.eql(nodeInfo);
                // commsMessages.should.have.length(1);
                // commsMessages[0].topic.should.equal("node/removed");
                // commsMessages[0].msg.should.eql(nodeInfo);
                done();
            }).otherwise(function(err) {
                done(err);
            });
        });
    });
});
