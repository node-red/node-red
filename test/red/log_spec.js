/**
 * Copyright 2014, 205 IBM Corp.
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
var util = require("util");

var log = require("../../red/log");

describe("red/log", function() {
    it('can be required without errors', function() {
        require("../../red/log");
    });

    beforeEach(function () {
        var spy = sinon.stub(util, 'log', function(arg){});
        var settings = {logging: { console: { level: 'metric', metrics: true } } };
        log.init(settings);
    });

    afterEach(function() {
        util.log.restore();
    });

    it('it can raise an error', function() {
        var ret = log.error("This is an error");
        sinon.assert.calledWithMatch(util.log,"[error] This is an error");
    });

    it('it can raise a trace', function() {
        var ret = log.trace("This is a trace");
        sinon.assert.calledWithMatch(util.log,"[trace] This is a trace");
    });

    it('it can raise a debug', function() {
        var ret = log.debug("This is a debug");
        sinon.assert.calledWithMatch(util.log,"[debug] This is a debug");
    });
    
    it('it can raise a info', function() {
        var ret = log.info("This is an info");
        sinon.assert.calledWithMatch(util.log,"[info] This is an info");
    });
    
    it('it can raise a warn', function() {
        var ret = log.warn("This is a warn");
        sinon.assert.calledWithMatch(util.log,"[warn] This is a warn");
    });

    it('it can raise a metric', function() {
        var metrics = {};
        metrics.level = log.METRIC;
        metrics.nodeid = "testid";
        metrics.event = "node.test.testevent";
        metrics.msgid = "12345";
        metrics.value = "the metric payload";
        var ret = log.log(metrics);
        util.log.calledOnce.should.be.true;
        util.log.firstCall.args[0].indexOf("[metric] ").should.equal(0);
        var body = JSON.parse(util.log.firstCall.args[0].substring(9));
        body.should.have.a.property("nodeid","testid");
        body.should.have.a.property("event","node.test.testevent");
        body.should.have.a.property("msgid","12345");
        body.should.have.a.property("value","the metric payload");
        body.should.have.a.property("timestamp");
        body.should.have.a.property("level",log.METRIC);
    });

    it('it checks metrics are enabled', function() {
        log.metric().should.equal(true);
        var sett = {logging: { console: { level: 'info', metrics: false } } };
        log.init(sett);
        log.metric().should.equal(false);
    });

    it('it logs node type and name if provided',function() {
        log.log({level:log.INFO,type:"nodeType",msg:"test",name:"nodeName",id:"nodeId"});
        util.log.calledOnce.should.be.true;
        util.log.firstCall.args[0].indexOf("[nodeType:nodeName]").should.not.equal(-1);
    });
    it('it logs node type and id if no name provided',function() {
        log.log({level:log.INFO,type:"nodeType",msg:"test",id:"nodeId"});
        util.log.calledOnce.should.be.true;
        util.log.firstCall.args[0].indexOf("[nodeType:nodeId]").should.not.equal(-1);
    });
    
    it('ignores lower level messages and metrics', function() {
        var settings = {logging: { console: { level: 'warn', metrics: false } } };
        log.init(settings);
        log.error("This is an error");
        log.warn("This is a warn");
        log.info("This is an info");
        log.debug("This is a debug");
        log.trace("This is a trace");
        log.log({level:log.METRIC,msg:"testMetric"});
        sinon.assert.calledWithMatch(util.log,"[error] This is an error");
        sinon.assert.calledWithMatch(util.log,"[warn] This is a warn");
        sinon.assert.neverCalledWithMatch(util.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(util.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(util.log,"[trace] This is a trace");
        sinon.assert.neverCalledWithMatch(util.log,"[metric] ");
    });
    it('ignores lower level messages but accepts metrics', function() {
        var settings = {logging: { console: { level: 'log', metrics: true } } };
        log.init(settings);
        log.error("This is an error");
        log.warn("This is a warn");
        log.info("This is an info");
        log.debug("This is a debug");
        log.trace("This is a trace");
        log.log({level:log.METRIC,msg:"testMetric"});
        sinon.assert.calledWithMatch(util.log,"[error] This is an error");
        sinon.assert.calledWithMatch(util.log,"[warn] This is a warn");
        sinon.assert.calledWithMatch(util.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(util.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(util.log,"[trace] This is a trace");
        sinon.assert.calledWithMatch(util.log,"[metric] ");
    });

    it('default settings set to INFO and metrics off', function() {
        log.init({logging:{}});
        log.error("This is an error");
        log.warn("This is a warn");
        log.info("This is an info");
        log.debug("This is a debug");
        log.trace("This is a trace");
        log.log({level:log.METRIC,msg:"testMetric"});
        sinon.assert.calledWithMatch(util.log,"[error] This is an error");
        sinon.assert.calledWithMatch(util.log,"[warn] This is a warn");
        sinon.assert.calledWithMatch(util.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(util.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(util.log,"[trace] This is a trace");
        sinon.assert.neverCalledWithMatch(util.log,"[metric] ");
    });
    it('no logger used if custom logger handler does not exist', function() {
        var settings = {logging: { customLogger: { level: 'trace', metrics: true } } };
        log.init(settings);
        log.error("This is an error");
        log.warn("This is a warn");
        log.info("This is an info");
        log.debug("This is a debug");
        log.trace("This is a trace");
        log.log({level:log.METRIC,msg:"testMetric"});
        sinon.assert.neverCalledWithMatch(util.log,"[error] This is an error");
        sinon.assert.neverCalledWithMatch(util.log,"[warn] This is a warn");
        sinon.assert.neverCalledWithMatch(util.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(util.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(util.log,"[trace] This is a trace");
        sinon.assert.neverCalledWithMatch(util.log,"[metric] ");
    });
});
