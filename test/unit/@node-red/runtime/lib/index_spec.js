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

        return {
            log:{
                log: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                trace: sinon.stub(),
                metric: sinon.stub().returns(!!metrics),
                _: function() { return "abc"}
            },
            i18n: {
                registerMessageCatalog: function(){
                    return Promise.resolve();
                }
            }
        }
    }
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
            runtime.init({testSettings: true, httpAdminRoot:"/"},mockUtil());
            settings.init.called.should.be.true();
            redNodes.init.called.should.be.true();
        });

        it("returns version", function() {
            runtime.init({testSettings: true, httpAdminRoot:"/"},mockUtil());
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
        var i18nRegisterMessageCatalog;

        beforeEach(function() {
            storageInit = sinon.stub(storage,"init",function(settings) {return Promise.resolve();});
            redNodesInit = sinon.stub(redNodes,"init", function() {});
            redNodesLoad = sinon.stub(redNodes,"load", function() {return Promise.resolve()});
            redNodesCleanModuleList = sinon.stub(redNodes,"cleanModuleList",function(){});
            redNodesLoadFlows = sinon.stub(redNodes,"loadFlows",function() {return Promise.resolve()});
            redNodesStartFlows = sinon.stub(redNodes,"startFlows",function() {});
            redNodesLoadContextsPlugin = sinon.stub(redNodes,"loadContextsPlugin",function() {return Promise.resolve()});
            i18nRegisterMessageCatalog = sinon.stub(util.i18n,"registerMessageCatalog",function() {return Promise.resolve()});
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
            i18nRegisterMessageCatalog.restore();
        });
        it("reports errored/missing modules",function(done) {
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function(cb) {
                return [
                    {  err:"errored",name:"errName" }, // error
                    {  module:"module",enabled:true,loaded:false,types:["typeA","typeB"]} // missing
                ].filter(cb);
            });
            var util = mockUtil();
            runtime.init({testSettings: true, httpAdminRoot:"/", load:function() { return Promise.resolve();}},util);
            // sinon.stub(console,"log");
            runtime.start().then(function() {
                // console.log.restore();
                try {
                    storageInit.calledOnce.should.be.true();
                    redNodesInit.calledOnce.should.be.true();
                    redNodesLoad.calledOnce.should.be.true();
                    redNodesLoadFlows.calledOnce.should.be.true();

                    util.log.warn.calledWithMatch("Failed to register 1 node type");
                    util.log.warn.calledWithMatch("Missing node modules");
                    util.log.warn.calledWithMatch(" - module: typeA, typeB");
                    redNodesCleanModuleList.calledOnce.should.be.true();
                    done();
                } catch(err) {
                    done(err);
                }
            }).catch(err=>{done(err)});
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
            var serverInstallModule = sinon.stub(redNodes,"installModule",function(name) { return Promise.resolve({nodes:[]});});
            var util = mockUtil();
            runtime.init({testSettings: true, autoInstallModules:true, httpAdminRoot:"/", load:function() { return Promise.resolve();}},util);
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    util.log.warn.calledWithMatch("Failed to register 2 node types");
                    util.log.warn.calledWithMatch("Missing node modules");
                    util.log.warn.calledWithMatch(" - module: typeA, typeB");
                    util.log.warn.calledWithMatch(" - node-red: typeC, typeD");
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
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function(cb) {
                return [
                    {  err:"errored",name:"errName" } // error
                ].filter(cb);
            });
            var util = mockUtil();
            runtime.init({testSettings: true, verbose:true, httpAdminRoot:"/", load:function() { return Promise.resolve();}},util);
            sinon.stub(console,"log");
            runtime.start().then(function() {
                console.log.restore();
                try {
                    util.log.warn.neverCalledWithMatch("Failed to register 1 node type");
                    util.log.warn.calledWithMatch("[errName] errored");
                    done();
                } catch(err) {
                    done(err);
                }
            }).catch(err=>{done(err)});
        });

        it("reports runtime metrics",function(done) {
            var stopFlows = sinon.stub(redNodes,"stopFlows",function() { return Promise.resolve();} );
            redNodesGetNodeList = sinon.stub(redNodes,"getNodeList", function() {return []});
            var util = mockUtil(true);
            runtime.init(
                {testSettings: true, runtimeMetricInterval:200, httpAdminRoot:"/", load:function() { return Promise.resolve();}},
                {},
                undefined,
                util);
            // sinon.stub(console,"log");
            runtime.start().then(function() {
                // console.log.restore();
                setTimeout(function() {
                    try {
                        util.log.log.args.should.have.lengthOf(3);
                        util.log.log.args[0][0].should.have.property("event","runtime.memory.rss");
                        util.log.log.args[1][0].should.have.property("event","runtime.memory.heapTotal");
                        util.log.log.args[2][0].should.have.property("event","runtime.memory.heapUsed");
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
        var stopFlows = sinon.stub(redNodes,"stopFlows",function() { return Promise.resolve();} );
        var closeContextsPlugin = sinon.stub(redNodes,"closeContextsPlugin",function() { return Promise.resolve();} );
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
