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
var util = require("util");

var NR_TEST_UTILS = require("nr-test-utils");

var log = NR_TEST_UTILS.require("@node-red/util").log;


describe("@node-red/util/log", function() {
    beforeEach(function () {
        var spy = sinon.stub(console, 'log').callsFake(function(arg){});
        var settings = {logging: { console: { level: 'metric', metrics: true } } };
        log.init(settings);
    });

    afterEach(function() {
        console.log.restore();
    });

    it('it can raise an error', function() {
        var ret = log.error("This is an error");
        sinon.assert.calledWithMatch(console.log,"[error] This is an error");
    });

    it('it can raise a trace', function() {
        var ret = log.trace("This is a trace");
        sinon.assert.calledWithMatch(console.log,"[trace] This is a trace");
    });

    it('it can raise a debug', function() {
        var ret = log.debug("This is a debug");
        sinon.assert.calledWithMatch(console.log,"[debug] This is a debug");
    });

    it('it can raise a info', function() {
        var ret = log.info("This is an info");
        sinon.assert.calledWithMatch(console.log,"[info] This is an info");
    });

    it('it can raise a warn', function() {
        var ret = log.warn("This is a warn");
        sinon.assert.calledWithMatch(console.log,"[warn] This is a warn");
    });

    it('it can raise a metric', function() {
        var metrics = {};
        metrics.level = log.METRIC;
        metrics.nodeid = "testid";
        metrics.event = "node.test.testevent";
        metrics.msgid = "12345";
        metrics.value = "the metric payload";
        var ret = log.log(metrics);
        console.log.calledOnce.should.be.true();
        console.log.firstCall.args[0].indexOf("[metric]").should.not.equal(-1);
        const parts = console.log.firstCall.args[0].split("[metric] ")
        var body = JSON.parse(parts[1])
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
        console.log.calledOnce.should.be.true();
        console.log.firstCall.args[0].indexOf("[nodeType:nodeName]").should.not.equal(-1);
    });
    it('it logs node type and id if no name provided',function() {
        log.log({level:log.INFO,type:"nodeType",msg:"test",id:"nodeId"});
        console.log.calledOnce.should.be.true();
        console.log.firstCall.args[0].indexOf("[nodeType:nodeId]").should.not.equal(-1);
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
        sinon.assert.calledWithMatch(console.log,"[error] This is an error");
        sinon.assert.calledWithMatch(console.log,"[warn] This is a warn");
        sinon.assert.neverCalledWithMatch(console.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(console.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(console.log,"[trace] This is a trace");
        sinon.assert.neverCalledWithMatch(console.log,"[metric] ");
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
        sinon.assert.calledWithMatch(console.log,"[error] This is an error");
        sinon.assert.calledWithMatch(console.log,"[warn] This is a warn");
        sinon.assert.calledWithMatch(console.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(console.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(console.log,"[trace] This is a trace");
        sinon.assert.calledWithMatch(console.log,"[metric] ");
    });

    it('default settings set to INFO and metrics off', function() {
        log.init({logging:{}});
        log.error("This is an error");
        log.warn("This is a warn");
        log.info("This is an info");
        log.debug("This is a debug");
        log.trace("This is a trace");
        log.log({level:log.METRIC,msg:"testMetric"});
        sinon.assert.calledWithMatch(console.log,"[error] This is an error");
        sinon.assert.calledWithMatch(console.log,"[warn] This is a warn");
        sinon.assert.calledWithMatch(console.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(console.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(console.log,"[trace] This is a trace");
        sinon.assert.neverCalledWithMatch(console.log,"[metric] ");
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
        sinon.assert.neverCalledWithMatch(console.log,"[error] This is an error");
        sinon.assert.neverCalledWithMatch(console.log,"[warn] This is a warn");
        sinon.assert.neverCalledWithMatch(console.log,"[info] This is an info");
        sinon.assert.neverCalledWithMatch(console.log,"[debug] This is a debug");
        sinon.assert.neverCalledWithMatch(console.log,"[trace] This is a trace");
        sinon.assert.neverCalledWithMatch(console.log,"[metric] ");
    });

    it('add a custom log handler directly', function() {
        var settings = {};
        log.init(settings);

        var logEvents = [];
        var loggerOne = {
            emit: function(event,msg) {
                logEvents.push({logger:1,msg:msg});
            }
        };
        var loggerTwo = {
            emit: function(event,msg) {
                logEvents.push({logger:2,msg:msg});
            }
        };
        log.addHandler(loggerOne);
        log.addHandler(loggerTwo);

        log.error("This is an error");
        log.warn("This is a warn");
        log.info("This is an info");
        log.debug("This is a debug");
        log.trace("This is a trace");
        log.log({level:log.METRIC,msg:"testMetric"});

        logEvents.filter(function(evt) { return evt.logger === 1}).should.have.lengthOf(6);
        logEvents.filter(function(evt) { return evt.logger === 2}).should.have.lengthOf(6);
    });

    it('remove a custom log handler directly', function() {
        var settings = {};
        log.init(settings);

        var logEvents = [];
        var loggerOne = {
            emit: function(event,msg) {
                logEvents.push({logger:1,msg:msg});
            }
        };
        var loggerTwo = {
            emit: function(event,msg) {
                logEvents.push({logger:2,msg:msg});
            }
        };
        log.addHandler(loggerOne);
        log.addHandler(loggerTwo);

        log.info("This is an info");
        logEvents.filter(function(evt) { return evt.logger === 1}).should.have.lengthOf(1);
        logEvents.filter(function(evt) { return evt.logger === 2}).should.have.lengthOf(1);


        log.removeHandler(loggerTwo);
        log.info("This is an info");
        logEvents.filter(function(evt) { return evt.logger === 1}).should.have.lengthOf(2);
        logEvents.filter(function(evt) { return evt.logger === 2}).should.have.lengthOf(1);

        log.removeHandler(loggerOne);
        log.info("This is an info");
        logEvents.filter(function(evt) { return evt.logger === 1}).should.have.lengthOf(2);
        logEvents.filter(function(evt) { return evt.logger === 2}).should.have.lengthOf(1);


    });
    it('it can log without exception', function() {
        var msg = {
            msg: {
              mystrangeobj:"hello",
            },
        };
        msg.msg.toString = function(){
          throw new Error('Exception in toString - should have been caught');
        }
        msg.msg.constructor = { name: "strangeobj" };
        var ret = log.info(msg.msg);
    });
    it('it can log an object but use .message', function() {
        var msg = {
            msg: {
              message: "my special message",
              mystrangeobj:"hello",
            },
        };
        var ret = log.info(msg.msg);
        sinon.assert.calledWithMatch(console.log,"my special message");
    });

    
    
});
