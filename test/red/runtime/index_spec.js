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

var api = require("../../../red/api");
var runtime = require("../../../red/runtime");

var redNodes = require("../../../red/runtime/nodes");
var storage = require("../../../red/runtime/storage");
var settings = require("../../../red/runtime/settings");
var log = require("../../../red/runtime/log");

describe("runtime", function() {
    afterEach(function() {
        if (console.log.restore) {
            console.log.restore();
        }
    })

    before(function() {
        process.env.NODE_RED_HOME = path.resolve(path.join(__dirname,"..","..",".."))
    });
    after(function() {
        delete process.env.NODE_RED_HOME;
    });

    describe("init", function() {
        beforeEach(function() {
            sinon.stub(log,"init",function() {});
            sinon.stub(settings,"init",function() {});
            sinon.stub(redNodes,"init",function() {})
        });
        afterEach(function() {
            log.init.restore();
            settings.init.restore();
            redNodes.init.restore();
        })

        it("initialises components", function() {
            runtime.init({testSettings: true, httpAdminRoot:"/"});
            log.init.called.should.be.true();
            settings.init.called.should.be.true();
            redNodes.init.called.should.be.true();
        });

        it("returns version", function() {
            runtime.init({testSettings: true, httpAdminRoot:"/"});
            /^\d+\.\d+\.\d+(-git)?$/.test(runtime.version()).should.be.true();

        })
    });

    describe("start",function() {
        var storageInit;
        var settingsLoad;
        var logMetric;
        var logWarn;
        var logInfo;
        var logLog;
        var redNodesInit;
        var redNodesLoad;
        var redNodesCleanModuleList;
        var redNodesGetNodeList;
        var redNodesLoadFlows;
        var redNodesStartFlows;

        beforeEach(function() {
            storageInit = sinon.stub(storage,"init",function(settings) {return when.resolve();});
            logMetric = sinon.stub(log,"metric",function() { return false; });
            logWarn = sinon.stub(log,"warn",function() { });
            logInfo = sinon.stub(log,"info",function() { });
            logLog = sinon.stub(log,"log",function(m) {});
            redNodesInit = sinon.stub(redNodes,"init", function() {});
            redNodesLoad = sinon.stub(redNodes,"load", function() {return when.resolve()});
            redNodesCleanModuleList = sinon.stub(redNodes,"cleanModuleList",function(){});
            redNodesLoadFlows = sinon.stub(redNodes,"loadFlows",function() {return when.resolve()});
            redNodesStartFlows = sinon.stub(redNodes,"startFlows",function() {});
        });
        afterEach(function() {
            storageInit.restore();
            logMetric.restore();
            logWarn.restore();
            logInfo.restore();
            logLog.restore();
            redNodesInit.restore();
            redNodesLoad.restore();
            redNodesGetNodeList.restore();
            redNodesCleanModuleList.restore();
            redNodesLoadFlows.restore();
            redNodesStartFlows.restore();
        });
        it("reports errored/missing modules",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function(cb) {
                return [
                    {  err:"errored",name:"errName" }, // error
                    {  module:"module",enabled:true,loaded:false,types:["typeA","typeB"]} // missing
                ].filter(cb);
            });
            runtime.init({testSettings: true, httpAdminRoot:"/", load:function() { return when.resolve();}});
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    storageInit.calledOnce.should.be.true();
                    redNodesInit.calledOnce.should.be.true();
                    redNodesLoad.calledOnce.should.be.true();
                    redNodesLoadFlows.calledOnce.should.be.true();

                    logWarn.calledWithMatch("Failed to register 1 node type");
                    logWarn.calledWithMatch("Missing node modules");
                    logWarn.calledWithMatch(" - module: typeA, typeB");
                    redNodesCleanModuleList.calledOnce.should.be.true();
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
            var serverInstallModule = sinon.stub(redNodes,"installModule",function(name) { return when.resolve();});
            runtime.init({testSettings: true, autoInstallModules:true, httpAdminRoot:"/", load:function() { return when.resolve();}});
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    logWarn.calledWithMatch("Failed to register 2 node types");
                    logWarn.calledWithMatch("Missing node modules");
                    logWarn.calledWithMatch(" - module: typeA, typeB");
                    logWarn.calledWithMatch(" - node-red: typeC, typeD");
                    redNodesCleanModuleList.calledOnce.should.be.false();
                    serverInstallModule.calledOnce.should.be.true();
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
            runtime.init({testSettings: true, verbose:true, httpAdminRoot:"/", load:function() { return when.resolve();}});
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    logWarn.neverCalledWithMatch("Failed to register 1 node type");
                    logWarn.calledWithMatch("[errName] errored");
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });

        it("reports runtime metrics",function(done) {
            var stopFlows = sinon.stub(redNodes,"stopFlows",function() {} );
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function() {return []});
            logMetric.restore();
            logMetric = sinon.stub(log,"metric",function() { return true; });
            runtime.init({testSettings: true, runtimeMetricInterval:200, httpAdminRoot:"/", load:function() { return when.resolve();}});
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                setTimeout(function() {
                    try {
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
                        runtime.stop();
                        stopFlows.restore();
                    }
                },300);
            });
        });


    });

    it("stops components", function() {
        var stopFlows = sinon.stub(redNodes,"stopFlows",function() {} );
        runtime.stop();
        stopFlows.called.should.be.true();
        stopFlows.restore();
    });
});
