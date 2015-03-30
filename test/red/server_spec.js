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
var when = require("when");
var sinon = require("sinon");
var child_process = require('child_process');
var fs = require("fs");

var comms = require("../../red/comms");
var redNodes = require("../../red/nodes");
var api = require("../../red/api");
var server = require("../../red/server");
var storage = require("../../red/storage");
var settings = require("../../red/settings");
var log = require("../../red/log");

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
        var dummyServer = {};
        server.init(dummyServer,{testSettings: true, httpAdminRoot:"/", load:function() { return when.resolve();}});
        
        commsInit.called.should.be.true;
        
        should.exist(server.app);
        should.exist(server.nodeApp);
        
        server.server.should.equal(dummyServer);
        
        commsInit.restore();
    });
    
    describe("start",function() {
        var commsInit;
        var storageInit;
        var settingsLoad;
        var apiInit;
        var logMetric;
        var logWarn;
        var logInfo;
        var logLog;
        var redNodesInit;
        var redNodesLoad;
        var redNodesCleanModuleList;
        var redNodesGetNodeList;
        var redNodesLoadFlows;
        var commsStart;
        
        beforeEach(function() {
            commsInit = sinon.stub(comms,"init",function() {});
            storageInit = sinon.stub(storage,"init",function(settings) {return when.resolve();});
            apiInit = sinon.stub(api,"init",function() {});
            logMetric = sinon.stub(log,"metric",function() { return false; });
            logWarn = sinon.stub(log,"warn",function() { });
            logInfo = sinon.stub(log,"info",function() { });
            logLog = sinon.stub(log,"log",function(m) {});
            redNodesInit = sinon.stub(redNodes,"init", function() {});
            redNodesLoad = sinon.stub(redNodes,"load", function() {return when.resolve()});
            redNodesCleanModuleList = sinon.stub(redNodes,"cleanModuleList",function(){});
            redNodesLoadFlows = sinon.stub(redNodes,"loadFlows",function() {});
            commsStart = sinon.stub(comms,"start",function(){});
        });
        afterEach(function() {
            commsInit.restore();
            storageInit.restore();
            apiInit.restore();
            logMetric.restore();
            logWarn.restore();
            logInfo.restore();
            logLog.restore();
            redNodesInit.restore();
            redNodesLoad.restore();
            redNodesGetNodeList.restore(); 
            redNodesCleanModuleList.restore();
            redNodesLoadFlows.restore();
            commsStart.restore();
        });
        it("reports errored/missing modules",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function(cb) {
                return [
                    {  err:"errored",name:"errName" }, // error
                    {  module:"module",enabled:true,loaded:false,types:["typeA","typeB"]} // missing
                ].filter(cb);
            });
            server.init({},{testSettings: true, httpAdminRoot:"/", load:function() { return when.resolve();}});
            server.start().then(function() {
                try {
                    apiInit.calledOnce.should.be.true;
                    storageInit.calledOnce.should.be.true;
                    redNodesInit.calledOnce.should.be.true;
                    redNodesLoad.calledOnce.should.be.true;
                    commsStart.calledOnce.should.be.true;
                    redNodesLoadFlows.calledOnce.should.be.true;
                    
                    logWarn.calledWithMatch("Failed to register 1 node type");
                    logWarn.calledWithMatch("Missing node modules");
                    logWarn.calledWithMatch(" - module: typeA, typeB");
                    redNodesCleanModuleList.calledOnce.should.be.true;
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
        it("initiates load of missing modules",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function(cb) {
                return [
                    {  err:"errored",name:"errName" }, // error
                    {  err:"errored",name:"errName" }, // error
                    {  module:"module",enabled:true,loaded:false,types:["typeA","typeB"]}, // missing
                    {  module:"node-red",enabled:true,loaded:false,types:["typeC","typeD"]} // missing
                ].filter(cb);
            });
            var serverInstallModule = sinon.stub(server,"installModule",function(name) { return when.resolve();});
            server.init({},{testSettings: true, autoInstallModules:true, httpAdminRoot:"/", load:function() { return when.resolve();}});
            server.start().then(function() {
                try {
                    apiInit.calledOnce.should.be.true;
                    logWarn.calledWithMatch("Failed to register 2 node types");
                    logWarn.calledWithMatch("Missing node modules");
                    logWarn.calledWithMatch(" - module: typeA, typeB");
                    logWarn.calledWithMatch(" - node-red: typeC, typeD");
                    redNodesCleanModuleList.calledOnce.should.be.false;
                    serverInstallModule.calledOnce.should.be.true;
                    serverInstallModule.calledWithMatch("module");
                    done();
                } catch(err) {
                    done(err);
                } finally {
                    serverInstallModule.restore();
                }
            });
        });
        it("reports errored modules when verbose is enabled",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function(cb) {
                return [
                    {  err:"errored",name:"errName" } // error
                ].filter(cb);
            });
            server.init({},{testSettings: true, verbose:true, httpAdminRoot:"/", load:function() { return when.resolve();}});
            server.start().then(function() {
                
                try {
                    apiInit.calledOnce.should.be.true;
                    logWarn.neverCalledWithMatch("Failed to register 1 node type");
                    logWarn.calledWithMatch("[errName] errored");
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
        
        it("reports runtime metrics",function(done) {
            var commsStop = sinon.stub(comms,"stop",function() {} );
            var stopFlows = sinon.stub(redNodes,"stopFlows",function() {} );
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function() {return []});
            logMetric.restore();
            logMetric = sinon.stub(log,"metric",function() { return true; });
            server.init({},{testSettings: true, runtimeMetricInterval:400, httpAdminRoot:"/", load:function() { return when.resolve();}});
            server.start().then(function() {
                setTimeout(function() {
                    try {
                        apiInit.calledOnce.should.be.true;
                        logLog.args.should.have.lengthOf(3);
                        logLog.args[0][0].should.have.property("level",log.METRIC);
                        logLog.args[0][0].should.have.property("event","runtime.memory.rss");
                        logLog.args[1][0].should.have.property("level",log.METRIC);
                        logLog.args[1][0].should.have.property("event","runtime.memory.heapTotal");
                        logLog.args[2][0].should.have.property("level",log.METRIC);
                        logLog.args[2][0].should.have.property("event","runtime.memory.heapUsed");
                        done();
                    } catch(err) {
                        done(err);
                    } finally {
                        server.stop();
                        commsStop.restore();
                        stopFlows.restore();
                    }
                },500);
            });
        }); 
        
        it("doesn't init api if httpAdminRoot set to false",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function() {return []});
            server.init({},{testSettings: true, httpAdminRoot:false, load:function() { return when.resolve();}});
            server.start().then(function() {
                setTimeout(function() {
                    try {
                        apiInit.calledOnce.should.be.false;
                        done();
                    } catch(err) {
                        done(err);
                    }
                },500);
            });
        });
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
        var nodes = {nodes:[
            {types:["a"]},
            {module:"foo",types:["b"]},
            {types:["c"],err:"error"}
        ]};
        var result = server.reportAddedModules(nodes);
        
        result.should.equal(nodes);
        commsMessages.should.have.length(1);
        commsMessages[0].topic.should.equal("node/added");
        commsMessages[0].msg.should.eql(nodes.nodes);
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
            var nodeInfo = {nodes:{module:"foo",types:["a"]}};
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
                commsMessages[0].msg.should.eql(nodeInfo.nodes);
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
