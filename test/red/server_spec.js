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
var when = require("when");
var sinon = require("sinon");
var child_process = require('child_process');
var fs = require("fs");

var comms = require("../../red/comms");
var redNodes = require("../../red/nodes");
var api = require("../../red/api");
var server = require("../../red/server");


describe("red/server", function() {
    var commsMessages = [];
    var commsPublish;
    
    beforeEach(function() {
        commsMessages = [];
    });
    
    before(function() {
        commsPublish = sinon.stub(comms,"publish", function(topic,msg,retained) {
            commsMessages.push({topic:topic,msg:msg,retained:retained});
        });
    });
    after(function() {
        commsPublish.restore();
    });
    
    it("initialises components", function() {
        var commsInit = sinon.stub(comms,"init",function() {});
        var apiInit = sinon.stub(api,"init",function() {});
        
        var dummyServer = {};
        server.init(dummyServer,{httpAdminRoot:"/"});
        
        commsInit.called.should.be.true;
        apiInit.called.should.be.true;
        
        should.exist(server.app);
        should.exist(server.nodeApp);
        
        server.server.should.equal(dummyServer);
        
        commsInit.restore();
        apiInit.restore();
    });
    
    it("does not initalise api when disabled", function() {
        var commsInit = sinon.stub(comms,"init",function() {});
        var apiInit = sinon.stub(api,"init",function() {});
        
        var dummyServer = {};
        server.init(dummyServer,{httpAdminRoot:false});
        
        commsInit.called.should.be.true;
        apiInit.called.should.be.false;
        
        should.exist(server.app);
        should.exist(server.nodeApp);
        
        server.server.should.equal(dummyServer);
        
        commsInit.restore();
        apiInit.restore();
    });
    
    it("stops components", function() {
        var commsStop = sinon.stub(comms,"stop",function() {} );
        var stopFlows = sinon.stub(redNodes,"stopFlows",function() {} );
        
        server.stop();
        
        commsStop.called.should.be.true;
        stopFlows.called.should.be.true;
        
        commsStop.restore();
        stopFlows.restore();
    });
    
    it("reports added modules", function() {
        var nodes = [
            {types:["a"]},
            {module:"foo",types:["b"]},
            {types:["c"],err:"error"}
        ];
        var result = server.reportAddedModules(nodes);
        
        result.should.equal(nodes);
        commsMessages.should.have.length(1);
        commsMessages[0].topic.should.equal("node/added");
        commsMessages[0].msg.should.eql(nodes);
    });
    
    it("reports removed modules", function() {
        var nodes = [
            {types:["a"]},
            {module:"foo",types:["b"]},
            {types:["c"],err:"error"}
        ];
        var result = server.reportRemovedModules(nodes);
        
        result.should.equal(nodes);
        commsMessages.should.have.length(1);
        commsMessages[0].topic.should.equal("node/removed");
        commsMessages[0].msg.should.eql(nodes);
    });
    
    describe("installs module", function() {
        it("rejects invalid module names", function(done) {
            var promises = [];
            promises.push(server.installModule("this_wont_exist "));
            promises.push(server.installModule("this_wont_exist;no_it_really_wont"));
            when.settle(promises).then(function(results) {
                results[0].state.should.be.eql("rejected");
                results[1].state.should.be.eql("rejected");
                done();
            });
        });
        
        it("rejects when npm returns a 404", function(done) {
            var exec = sinon.stub(child_process,"exec",function(cmd,opt,cb) {
                cb(new Error(),""," 404  this_wont_exist");
            });
            
            server.installModule("this_wont_exist").otherwise(function(err) {
                err.code.should.be.eql(404);
                done();
            }).finally(function() {
                exec.restore();
            });
        });
        it("rejects with generic error", function(done) {
            var exec = sinon.stub(child_process,"exec",function(cmd,opt,cb) {
                cb(new Error("test_error"),"","");
            });
            
            server.installModule("this_wont_exist").then(function() {
                done(new Error("Unexpected success"));
            }).otherwise(function(err) {
                done();
            }).finally(function() {
                exec.restore();
            });
        });
        it("succeeds when module is found", function(done) {
            var nodeInfo = {module:"foo",types:["a"]};
            var exec = sinon.stub(child_process,"exec",function(cmd,opt,cb) {
                cb(null,"","");
            });
            var addModule = sinon.stub(redNodes,"addModule",function(md) {
                return when.resolve(nodeInfo);
            });
            
            server.installModule("this_wont_exist").then(function(info) {
                info.should.eql(nodeInfo);
                commsMessages.should.have.length(1);
                commsMessages[0].topic.should.equal("node/added");
                commsMessages[0].msg.should.eql(nodeInfo);
                done();
            }).otherwise(function(err) {
                done(err);
            }).finally(function() {
                exec.restore();
                addModule.restore();
            });
        });
    });
    describe("uninstalls module", function() {
        it("rejects invalid module names", function(done) {
            var promises = [];
            promises.push(server.uninstallModule("this_wont_exist "));
            promises.push(server.uninstallModule("this_wont_exist;no_it_really_wont"));
            when.settle(promises).then(function(results) {
                results[0].state.should.be.eql("rejected");
                results[1].state.should.be.eql("rejected");
                done();
            });
        });

        it("rejects with generic error", function(done) {
            var nodeInfo = [{module:"foo",types:["a"]}];
            var removeModule = sinon.stub(redNodes,"removeModule",function(md) {
                return when.resolve(nodeInfo);
            });
            var exec = sinon.stub(child_process,"exec",function(cmd,opt,cb) {
                cb(new Error("test_error"),"","");
            });
            
            server.uninstallModule("this_wont_exist").then(function() {
                done(new Error("Unexpected success"));
            }).otherwise(function(err) {
                done();
            }).finally(function() {
                exec.restore();
                removeModule.restore();
            });
        });
        it("succeeds when module is found", function(done) {
            var nodeInfo = [{module:"foo",types:["a"]}];
            var removeModule = sinon.stub(redNodes,"removeModule",function(md) {
                return nodeInfo;
            });
            var exec = sinon.stub(child_process,"exec",function(cmd,opt,cb) {
                cb(null,"","");
            });
            var exists = sinon.stub(fs,"existsSync", function(fn) { return true; });
            
            server.uninstallModule("this_wont_exist").then(function(info) {
                info.should.eql(nodeInfo);
                commsMessages.should.have.length(1);
                commsMessages[0].topic.should.equal("node/removed");
                commsMessages[0].msg.should.eql(nodeInfo);
                done();
            }).otherwise(function(err) {
                done(err);
            }).finally(function() {
                exec.restore();
                removeModule.restore();
                exists.restore();
            });
        });
    });
    
});
