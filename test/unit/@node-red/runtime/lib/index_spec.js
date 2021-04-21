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
var path = require("path");

var NR_TEST_UTILS = require("nr-test-utils");

var api = NR_TEST_UTILS.require("@node-red/runtime/lib/api");
var runtime = NR_TEST_UTILS.require("@node-red/runtime");

var redNodes = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes");
var storage = NR_TEST_UTILS.require("@node-red/runtime/lib/storage");
var settings = NR_TEST_UTILS.require("@node-red/runtime/lib/settings");
var util = NR_TEST_UTILS.require("@node-red/util");

var log = NR_TEST_UTILS.require("@node-red/util").log;
var i18n = NR_TEST_UTILS.require("@node-red/util").i18n;

describe("runtime", function() {
    afterEach(function() {
        if (console.log.restore) {
            console.log.restore();
        }
    })

    before(function() {
        process.env.NODE_RED_HOME = NR_TEST_UTILS.resolve("node-red");
    });
    after(function() {
        delete process.env.NODE_RED_HOME;
    });
    function mockUtil(metrics) {
        sinon.stub(log,"log").callsFake(function(){})
        sinon.stub(log,"warn").callsFake(function(){})
        sinon.stub(log,"info").callsFake(function(){})
        sinon.stub(log,"trace").callsFake(function(){})
        sinon.stub(log,"metric").callsFake(function(){ return !!metrics })
        sinon.stub(log,"_").callsFake(function(){ return "abc"})
        sinon.stub(i18n,"registerMessageCatalog").callsFake(function(){ return Promise.resolve()})
    }
    function unmockUtil() {
        log.log.restore && log.log.restore();
        log.warn.restore && log.warn.restore();
        log.info.restore && log.info.restore();
        log.trace.restore && log.trace.restore();
        log.metric.restore && log.metric.restore();
        log._.restore && log._.restore();
        i18n.registerMessageCatalog.restore && i18n.registerMessageCatalog.restore();
    }
    describe("init", function() {
        beforeEach(function() {
            sinon.stub(log,"init").callsFake(function() {});
            sinon.stub(settings,"init").callsFake(function() {});
            sinon.stub(redNodes,"init").callsFake(function() {})
            mockUtil();
        });
        afterEach(function() {
            log.init.restore();
            settings.init.restore();
            redNodes.init.restore();
            unmockUtil();
        })

        it("initialises components", function() {
            runtime.init({testSettings: true, httpAdminRoot:"/"});
            settings.init.called.should.be.true();
            redNodes.init.called.should.be.true();
        });

        it("returns version", function() {
            runtime.init({testSettings: true, httpAdminRoot:"/"});
            return runtime.version().then(version => {
                /^\d+\.\d+\.\d+(-.*)?$/.test(version).should.be.true();
            });


        })
    });

    describe("start",function() {
        var storageInit;
        var settingsLoad;
        var redNodesInit;
        var redNodesLoad;
        var redNodesCleanModuleList;
        var redNodesGetNodeList;
        var redNodesLoadFlows;
        var redNodesStartFlows;
        var redNodesLoadContextsPlugin;

        beforeEach(function() {
            storageInit = sinon.stub(storage,"init").callsFake(function(settings) {return Promise.resolve();});
            redNodesInit = sinon.stub(redNodes,"init").callsFake(function() {});
            redNodesLoad = sinon.stub(redNodes,"load").callsFake(function() {return Promise.resolve()});
            redNodesCleanModuleList = sinon.stub(redNodes,"cleanModuleList").callsFake(function(){});
            redNodesLoadFlows = sinon.stub(redNodes,"loadFlows").callsFake(function() {return Promise.resolve()});
            redNodesStartFlows = sinon.stub(redNodes,"startFlows").callsFake(function() {});
            redNodesLoadContextsPlugin = sinon.stub(redNodes,"loadContextsPlugin").callsFake(function() {return Promise.resolve()});
            mockUtil();
        });
        afterEach(function() {
            storageInit.restore();
            redNodesInit.restore();
            redNodesLoad.restore();
            redNodesGetNodeList.restore();
            redNodesCleanModuleList.restore();
            redNodesLoadFlows.restore();
            redNodesStartFlows.restore();
            redNodesLoadContextsPlugin.restore();
            unmockUtil();
        });
        it("reports errored/missing modules",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList").callsFake(function(cb) {
                return [
                    {  err:"errored",name:"errName" }, // error
                    {  module:"module",enabled:true,loaded:false,types:["typeA","typeB"]} // missing
                ].filter(cb);
            });
            runtime.init({testSettings: true, httpAdminRoot:"/", load:function() { return Promise.resolve();}});
            // sinon.stub(console,"log");
            runtime.start().then(function() {
                // console.log.restore();
                try {
                    storageInit.calledOnce.should.be.true();
                    redNodesInit.calledOnce.should.be.true();
                    redNodesLoad.calledOnce.should.be.true();
                    redNodesLoadFlows.calledOnce.should.be.true();

                    log.warn.calledWithMatch("Failed to register 1 node type");
                    log.warn.calledWithMatch("Missing node modules");
                    log.warn.calledWithMatch(" - module: typeA, typeB");
                    redNodesCleanModuleList.calledOnce.should.be.true();
                    done();
                } catch(err) {
                    done(err);
                }
            }).catch(err=>{done(err)});
        });
        it("initiates load of missing modules",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList").callsFake(function(cb) {
                return [
                    {  err:"errored",name:"errName" }, // error
                    {  err:"errored",name:"errName" }, // error
                    {  module:"module",enabled:true,loaded:false,types:["typeA","typeB"]}, // missing
                    {  module:"node-red",enabled:true,loaded:false,types:["typeC","typeD"]} // missing
                ].filter(cb);
            });
            var serverInstallModule = sinon.stub(redNodes,"installModule").callsFake(function(name) { return Promise.resolve({nodes:[]});});
            runtime.init({testSettings: true, autoInstallModules:true, httpAdminRoot:"/", load:function() { return Promise.resolve();}});
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    log.warn.calledWithMatch("Failed to register 2 node types");
                    log.warn.calledWithMatch("Missing node modules");
                    log.warn.calledWithMatch(" - module: typeA, typeB");
                    log.warn.calledWithMatch(" - node-red: typeC, typeD");
                    redNodesCleanModuleList.calledOnce.should.be.false();
                    serverInstallModule.calledOnce.should.be.true();
                    serverInstallModule.calledWithMatch("module");
                    done();
                } catch(err) {
                    done(err);
                } finally {
                    serverInstallModule.restore();
                }
            }).catch(err=>{done(err)});
        });
        it("reports errored modules when verbose is enabled",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList").callsFake(function(cb) {
                return [
                    {  err:"errored",name:"errName" } // error
                ].filter(cb);
            });
            runtime.init({testSettings: true, verbose:true, httpAdminRoot:"/", load:function() { return Promise.resolve();}});
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    log.warn.neverCalledWithMatch("Failed to register 1 node type");
                    log.warn.calledWithMatch("[errName] errored");
                    done();
                } catch(err) {
                    done(err);
                }
            }).catch(err=>{done(err)});
        });

        it("reports runtime metrics",function(done) {
            var stopFlows = sinon.stub(redNodes,"stopFlows").callsFake(function() { return Promise.resolve();} );
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList").callsFake(function() {return []});
            unmockUtil();
            mockUtil(true);
            runtime.init(
                {testSettings: true, runtimeMetricInterval:200, httpAdminRoot:"/", load:function() { return Promise.resolve();}},
                {},
                undefined);
            // sinon.stub(console,"log");
            runtime.start().then(function() {
                // console.log.restore();
                setTimeout(function() {
                    try {
                        log.log.args.should.have.lengthOf(3);
                        log.log.args[0][0].should.have.property("event","runtime.memory.rss");
                        log.log.args[1][0].should.have.property("event","runtime.memory.heapTotal");
                        log.log.args[2][0].should.have.property("event","runtime.memory.heapUsed");
                        done();
                    } catch(err) {
                        done(err);
                    } finally {
                        runtime.stop();
                        stopFlows.restore();
                    }
                },300);
            }).catch(err=>{done(err)});
        });


    });

    it("stops components", function(done) {
        var stopFlows = sinon.stub(redNodes,"stopFlows").callsFake(function() { return Promise.resolve();} );
        var closeContextsPlugin = sinon.stub(redNodes,"closeContextsPlugin").callsFake(function() { return Promise.resolve();} );
        runtime.stop().then(function(){
            stopFlows.called.should.be.true();
            closeContextsPlugin.called.should.be.true();
            stopFlows.restore();
            closeContextsPlugin.restore();
            done();
        }).catch(function(err){
            stopFlows.restore();
            closeContextsPlugin.restore();
            return done(err)
        });
    });
});
