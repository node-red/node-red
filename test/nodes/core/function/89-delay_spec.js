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

var delayNode = require("nr-test-utils").require("@node-red/nodes/core/function/89-delay.js");
var helper = require("node-red-node-test-helper");
var RED = require("nr-test-utils").require("node-red/lib/red");

var GRACE_PERCENTAGE=10;

var nanosToSeconds = 1000000000;
var millisToSeconds = 1000;

var secondsToMinutes = 60;
var secondsToHours = 3600;
var secondsToDays = 86400;

describe('delay Node', function() {

    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        RED.settings.nodeMessageBufferMaxLength = 0;
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function(done) {
        var flow = [{"id":"delayNode1","type":"delay", "nbRateUnits":"1", "name":"delayNode","pauseType":"delay","timeout":"5","timeoutUnits":"seconds","rate":"1","rateUnits":"day","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[[]]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            delayNode1.should.have.property('name', 'delayNode');
            delayNode1.should.have.property('rate', 86400000);
            done();
        });
    });

    it('should be able to set rate to hour', function(done) {
        var flow = [{"id":"delayNode1","type":"delay", "nbRateUnits":"1", "name":"delayNode","pauseType":"delay","timeout":"5","timeoutUnits":"seconds","rate":"1","rateUnits":"hour","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[[]]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            delayNode1.should.have.property('name', 'delayNode');
            delayNode1.should.have.property('rate', 3600000);
            done();
        });
    });

    it('should be able to set rate to minute', function(done) {
        var flow = [{"id":"delayNode1","type":"delay", "nbRateUnits":"1", "name":"delayNode","pauseType":"delay","timeout":"5","timeoutUnits":"seconds","rate":"1","rateUnits":"minute","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[[]]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            delayNode1.should.have.property('name', 'delayNode');
            delayNode1.should.have.property('rate', 60000);
            done();
        });
    });

    var TimeUnitEnum = {
        MILLIS : "milliseconds",
        SECONDS : "seconds",
        MINUTES : "minutes",
        HOURS : "hours",
        DAYS : "days"
    }

    /**
     * Tells whether two numeric values are close enough to each other
     * @param actualValue - the value we're testing
     * @param expectedValue - the value we're matching the test value against
     * @param tolerancePercent - the percentage of tolerated deviation (0 means equals)
     */
    function closeEnough(actualValue, expectedValue, tolerancePercent) {
        var toReturn;
        var toleranceFraction = expectedValue * (tolerancePercent/100);
        var minExpected = expectedValue - toleranceFraction;
        var maxExpected = expectedValue + toleranceFraction;

        if (actualValue >= minExpected && actualValue <= maxExpected) {
            toReturn = true;
        } else {
            toReturn = false;
        }
        return toReturn;
    }

    /**
     * Runs a delay test
     * @param aTimeout - the timeout quantity
     * @param aTimeoutUnit - the unit of the timeout: milliseconds, seconds, minutes, hours, days
     */
    function genericDelayTest(aTimeout, aTimeoutUnit, done) {
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"delay","timeout":aTimeout,"timeoutUnits":aTimeoutUnit,"rate":"1","rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                try {
                    var endTime = process.hrtime(startTime);
                    var runtimeNanos = ( (endTime[0] * nanosToSeconds) + endTime[1] );
                    var runtimeSeconds = runtimeNanos / nanosToSeconds;
                    var aTimeoutUnifiedToSeconds;

                    // calculating the timeout in seconds
                    if (aTimeoutUnit == TimeUnitEnum.MILLIS) {
                        aTimeoutUnifiedToSeconds = aTimeout / millisToSeconds;
                    } else if (aTimeoutUnit == TimeUnitEnum.SECONDS) {
                        aTimeoutUnifiedToSeconds = aTimeout;
                    } else if (aTimeoutUnit == TimeUnitEnum.MINUTES) {
                        aTimeoutUnifiedToSeconds = aTimeout * secondsToMinutes;
                    } else if (aTimeoutUnit == TimeUnitEnum.HOURS) {
                        aTimeoutUnifiedToSeconds = aTimeout * secondsToHours;
                    } else if (aTimeoutUnit == TimeUnitEnum.DAYS) {
                        aTimeoutUnifiedToSeconds = aTimeout * secondsToDays;
                    }

                    if (closeEnough(runtimeSeconds, aTimeoutUnifiedToSeconds, GRACE_PERCENTAGE)) {
                        done();
                    } else {
                        try {
                            should.fail(null, null, "Delayed runtime seconds " + runtimeSeconds + " was not close enough to exlected timeout seconds: " + aTimeoutUnifiedToSeconds);
                        } catch (err) {
                            done(err);
                        }
                    }
                } catch(err) {
                    done(err);
                }
            });
            var startTime = process.hrtime();
            delayNode1.receive({payload:"delayMe"});
        });
    }

    /**
     * We send a message, take a timestamp then when the message is received by the helper node, we take another timestamp.
     * Then check if the message has been delayed by the expected amount.
     */

    it('delays the message in seconds', function(done) {
        genericDelayTest(0.5, "seconds", done);
    });

    it('delays the message in milliseconds', function(done) {
        genericDelayTest(500, "milliseconds", done);
    });

    it('delays the message in minutes', function(done) { // this is also 0.5 seconds
        genericDelayTest(0.00833, "minutes", done);
    });

    it('delays the message in hours', function(done) { // this is also 0.5 seconds
        genericDelayTest(0.0001388, "hours", done);
    });

    it('delays the message in days', function(done) { // this is also 0.5 seconds
        genericDelayTest(0.000005787, "days", done);
    });

    /**
     * Runs a rate limit test - only testing seconds!
     * @param aLimit - the message limit count
     * @param nbUnit - the multiple of the unit, aLimit Message for nbUnit Seconds
     * @param runtimeInMillis - when to terminate run and count messages received
     */
    function genericRateLimitSECONDSTest(aLimit, nbUnit, runtimeInMillis, rateValue, done) {
        var flow = [{"id":"delayNode1","type":"delay","nbRateUnits":nbUnit,"name":"delayNode","pauseType":"rate","timeout":5,"timeoutUnits":"seconds","rate":aLimit,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var receivedMessagesStack = [];
            var rate = 1000 / aLimit * nbUnit;

            var receiveTimestamp;

            helperNode1.on("input", function(msg) {
                if (receiveTimestamp) {
                    var elapse = process.hrtime(receiveTimestamp);
                    var receiveInterval = (elapse[0] * 1000) + ((elapse[1] / nanosToSeconds) * 1000);
                    receiveInterval.should.be.above(rate * 0.9);
                }
                receiveTimestamp = process.hrtime();
                receivedMessagesStack.push(msg);
            });

            var possibleMaxMessageCount = Math.ceil(aLimit * (runtimeInMillis / 1000) + aLimit); // +aLimit as at the start of the 2nd period, we're allowing the 3rd burst

            var i = 0;
            for (; i < possibleMaxMessageCount + 1; i++) {
                delayNode1.receive({ payload: i, rate: rateValue });
            }

            setTimeout(function() {
                try {
                    receivedMessagesStack.length.should.be.lessThan(possibleMaxMessageCount);
                    for (var j = 0; j < receivedMessagesStack.length; j++) {
                        if (receivedMessagesStack[j].payload === j) {
                            if (j === (receivedMessagesStack.length -1)) { // last message, all matched so far
                                done();
                            }
                        } else {
                            should.fail(null, null, "Received messages were not received in order. Message was " + receivedMessagesStack[i].payload + " on count " + i);
                        }
                    }
                } catch (err) {
                    done(err);
                }
            }, runtimeInMillis);
        });
    }

    it('limits the message rate to 1 per second', function(done) {
        genericRateLimitSECONDSTest(1, 1, 1500, null, done);
    });

    it('limits the message rate to 1 per 2 seconds', function(done) {
        this.timeout(6000);
        genericRateLimitSECONDSTest(1, 2, 3000, null, done);
    });

    it('limits the message rate to 2 per seconds, 2 seconds', function(done) {
        this.timeout(6000);
        genericRateLimitSECONDSTest(2, 1, 2100, null, done);
    });

    it('limits the message rate using msg.rate', function (done) {
        RED.settings.nodeMessageBufferMaxLength = 3;
        genericRateLimitSECONDSTest(1, 1, 1500, 2000, done);
    });

    /**
     * Runs a rate limit test with drop support - only testing seconds!
     * @param aLimit - the message limit count
     * @param nbUnit - the multiple of the unit, aLimit Message for nbUnit Seconds
     * @param runtimeInMillis - when to terminate run and count messages received
     */
    function dropRateLimitSECONDSTest(aLimit, nbUnit, runtimeInMillis, rateValue, sendIntermediate, done) {
        if (!done) {
            done = sendIntermediate;
            sendIntermediate = false;
        }
        var outputs = 1;
        if (sendIntermediate) {
            outputs = 2;
        }
        var flow = [
            {"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":5,"nbRateUnits":nbUnit,"timeoutUnits":"seconds","rate":aLimit,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":true,outputs:outputs,"wires":[["helperNode1"],["helperNode2"]]},
            {id:"helperNode1", type:"helper", wires:[]},
            {id:"helperNode2", type:"helper", wires:[]}
        ]

                    ;
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var helperNode2 = helper.getNode("helperNode2");
            var receivedMessagesStack = [];
            var receivedIntermediateMessagesStack = [];

            // Add a small grace to the calculated delay
            var rate = 1000/aLimit + 10;

            var receiveTimestamp;

            helperNode1.on("input", function(msg) {
                if (receiveTimestamp) {
                    var elapse = process.hrtime(receiveTimestamp);
                    var receiveInterval = (elapse[0] * 1000) + ((elapse[1] / nanosToSeconds) * 1000);
                    receiveInterval.should.be.above(rate * 0.9);
                }
                receiveTimestamp = process.hrtime();
                receivedMessagesStack.push(msg);
            });
            helperNode2.on("input", function(msg) {
                receivedIntermediateMessagesStack.push(msg);
            });

            var possibleMaxMessageCount = Math.ceil(aLimit * (runtimeInMillis / 1000) + aLimit); // +aLimit as at the start of the 2nd period, we're allowing the 3rd burst

            var i = 0;
            delayNode1.receive({ payload: i, rate: rateValue });
            i++;
            for (; i < possibleMaxMessageCount + 1; i++) {
                setTimeout(function() {
                    delayNode1.receive({payload:i});
                }, 2 * ((rate * i) / possibleMaxMessageCount) );
            }

            //we need to send a message delayed so that it doesn't get dropped
            setTimeout(function() {
                delayNode1.receive({payload:++i});
            }, runtimeInMillis - 300); // should give enough time to squeeze another message in

            setTimeout(function() {
                try {
                    receivedMessagesStack.length.should.be.lessThan(possibleMaxMessageCount + 1);
                    receivedMessagesStack.length.should.be.greaterThan(2); // ensure that we receive more than 1st and last message
                    receivedMessagesStack[0].payload.should.be.exactly(0); // means we received the last message injected just before test termination
                    var foundAtLeastOneDrop = false;
                    for (var i = 0; i < receivedMessagesStack.length; i++) {
                        if (i > 0) {
                            if (receivedMessagesStack[i].payload - receivedMessagesStack[i - 1].payload > 1) {
                                foundAtLeastOneDrop = true;
                            }
                        }
                    }
                    foundAtLeastOneDrop.should.be.true();
                    if (sendIntermediate) {
                        receivedIntermediateMessagesStack.length.should.be.greaterThan(0);
                    } else {
                        receivedIntermediateMessagesStack.length.should.be.exactly(0);
                    }
                    done();
                } catch (err) {
                    done(err);
                }
            }, runtimeInMillis);
        });
    }

    it('limits the message rate to 1 per second, 4 seconds, with drop', function(done) {
        this.timeout(6000);
        dropRateLimitSECONDSTest(1, 1, 4000, null, done);
    });

    it('limits the message rate to 1 per 2 seconds, 4 seconds, with drop', function(done) {
        this.timeout(6000);
        dropRateLimitSECONDSTest(1, 2, 4500, null, done);
    });

    it('limits the message rate to 2 per second, 5 seconds, with drop', function(done) {
        this.timeout(6000);
        dropRateLimitSECONDSTest(2, 1, 5000, null, done);
    });

    it('limits the message rate to 2 per second, 5 seconds, with drop, 2nd output', function(done) {
        this.timeout(6000);
        dropRateLimitSECONDSTest(2, 1, 5000, null, true, done);
    });

    it('limits the message rate with drop using msg.rate', function (done) {
        this.timeout(6000);
        RED.settings.nodeMessageBufferMaxLength = 3;
        dropRateLimitSECONDSTest(2, 1, 5000, 1000, done);
    });

    /**
     * Returns true if the actualTimeout is gracefully in between the timeoutFrom and timeoutTo
     * values. Gracefully means that inBetween could actually mean smaller/greater values
     * than the timeout range so long as it's within an actual grace percentage.
     * @param timeoutFrom - The expected timeout range (low number)
     * @param timeoutTo - The expected timeout range (high number)
     * @param actualTimeout - The actual measured timeout value of test
     * @param allowedGracePercent - The percentage of grace allowed
     */
    function inBetweenDelays(timeoutFrom, timeoutTo, actualTimeout, allowedGracePercent) {
        if (closeEnough(actualTimeout, timeoutFrom, allowedGracePercent)) {
            return true;
        } else if (closeEnough(actualTimeout, timeoutTo, allowedGracePercent)) {
            return true;
        } else if (timeoutFrom < actualTimeout && timeoutTo > actualTimeout) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Runs a VARIABLE DELAY test, checks if the delay is in between the given timeout values
     * @param aTimeoutFrom - the timeout quantity which is the minimal acceptable wait period
     * @param aTimeoutTo - the timeout quantity which is the maximum acceptable wait period
     * @param aTimeoutUnit - the unit of the timeout: milliseconds, seconds, minutes, hours, days
     * @param delay - the variable delay: milliseconds
     */
    function variableDelayTest(aTimeoutFrom, aTimeoutTo, aTimeoutUnit, delay, done) {
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"delayv","timeout":0.5,"timeoutUnits":"seconds","rate":"1","rateUnits":"second","randomFirst":aTimeoutFrom,"randomLast":aTimeoutTo,"randomUnits":aTimeoutUnit,"drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                try {
                    var endTime = process.hrtime(startTime);
                    var runtimeNanos = ( (endTime[0] * nanosToSeconds) + endTime[1] );
                    var runtimeSeconds = runtimeNanos / nanosToSeconds;
                    var aTimeoutFromUnifiedToSeconds;
                    var aTimeoutToUnifiedToSeconds;

                    // calculating the timeout in seconds
                    if (aTimeoutUnit == TimeUnitEnum.MILLIS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom / millisToSeconds;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo / millisToSeconds;
                    } else if (aTimeoutUnit == TimeUnitEnum.SECONDS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo;
                    } else if (aTimeoutUnit == TimeUnitEnum.MINUTES) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToMinutes;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToMinutes;
                    } else if (aTimeoutUnit == TimeUnitEnum.HOURS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToHours;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToHours;
                    } else if (aTimeoutUnit == TimeUnitEnum.DAYS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToDays;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToDays;
                    }

                    if (inBetweenDelays(aTimeoutFromUnifiedToSeconds, aTimeoutToUnifiedToSeconds, runtimeSeconds, GRACE_PERCENTAGE)) {
                        done();
                    } else {
                        try {
                            should.fail(null, null, "Delayed runtime seconds " + runtimeSeconds + " was not \"in between enough\" enough to expected values of: " + aTimeoutFromUnifiedToSeconds + " and " + aTimeoutToUnifiedToSeconds);
                        } catch (err) {
                            done(err);
                        }
                    }
                } catch(err) {
                    done(err);
                }
            });
            var startTime = process.hrtime();
            delayNode1.receive({payload:"delayMe", delay:delay});
        });
    }

    it('variable delay set by msg.delay the message in milliseconds', function(done) {
        variableDelayTest("200", "300", "milliseconds", 250, done);
    });

    it('variable delay is the default if msg.delay not specified', function(done) {
        variableDelayTest("450", "550", "milliseconds", null, done);
    });

    it('variable delay is zero if msg.delay is zero', function(done) {
        variableDelayTest("0", "20", "milliseconds", 0, done);
    });

    it('variable delay is zero if msg.delay is negative', function(done) {
        variableDelayTest("0", "20", "milliseconds", -250, done);
    });

    /**
     * Runs a RANDOM DELAY test, checks if the delay is in between the given timeout values
     * @param aTimeoutFrom - the timeout quantity which is the minimal acceptable wait period
     * @param aTimeoutTo - the timeout quantity which is the maximum acceptable wait period
     * @param aTimeoutUnit - the unit of the timeout: milliseconds, seconds, minutes, hours, days
     */
    function randomDelayTest(aTimeoutFrom, aTimeoutTo, aTimeoutUnit, done) {
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"random","timeout":5,"timeoutUnits":"seconds","rate":"1","rateUnits":"second","randomFirst":aTimeoutFrom,"randomLast":aTimeoutTo,"randomUnits":aTimeoutUnit,"drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                try {
                    var endTime = process.hrtime(startTime);
                    var runtimeNanos = ( (endTime[0] * nanosToSeconds) + endTime[1] );
                    var runtimeSeconds = runtimeNanos / nanosToSeconds;
                    var aTimeoutFromUnifiedToSeconds;
                    var aTimeoutToUnifiedToSeconds;

                    // calculating the timeout in seconds
                    if (aTimeoutUnit == TimeUnitEnum.MILLIS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom / millisToSeconds;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo / millisToSeconds;
                    } else if (aTimeoutUnit == TimeUnitEnum.SECONDS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo;
                    } else if (aTimeoutUnit == TimeUnitEnum.MINUTES) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToMinutes;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToMinutes;
                    } else if (aTimeoutUnit == TimeUnitEnum.HOURS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToHours;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToHours;
                    } else if (aTimeoutUnit == TimeUnitEnum.DAYS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToDays;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToDays;
                    }

                    if (inBetweenDelays(aTimeoutFromUnifiedToSeconds, aTimeoutToUnifiedToSeconds, runtimeSeconds, GRACE_PERCENTAGE)) {
                        done();
                    } else {
                        try {
                            should.fail(null, null, "Delayed runtime seconds " + runtimeSeconds + " was not \"in between enough\" enough to expected values of: " + aTimeoutFromUnifiedToSeconds + " and " + aTimeoutToUnifiedToSeconds);
                        } catch (err) {
                            done(err);
                        }
                    }
                } catch(err) {
                    done(err);
                }
            });
            var startTime = process.hrtime();
            delayNode1.receive({payload:"delayMe"});
        });
    }

    it('randomly delays the message in seconds', function(done) {
        randomDelayTest(0.4, 0.8, "seconds", done);
    });

    it('randomly delays the message in milliseconds', function(done) {
        randomDelayTest("400", "800", "milliseconds", done);
    });

    it('randomly delays the message in minutes', function(done) {
        randomDelayTest(0.0066, 0.0133, "minutes", done);
    });

    it('delays the message in hours', function(done) {
        randomDelayTest(0.000111111, 0.000222222, "hours", done);
    });

    it('delays the message in days', function(done) {
        randomDelayTest(0.0000046296, 0.0000092593, "days", done);
    });

    it('handles delay queue', function(done) {
        this.timeout(2000);
        var flow = [{id:"delayNode1", type :"delay","name":"delayNode","nbRateUnits":"1","pauseType":"queue","timeout":1,"timeoutUnits":"seconds","rate":4,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "_none_") {
                        msg.payload.should.equal(2);
                        (Date.now() - t).should.be.approximately(500,200);
                    }
                    else if (msg.topic === "A") {
                        msg.payload.should.equal(4);
                        (Date.now() - t).should.be.approximately(750,200);
                    }
                    else {
                        msg.topic.should.equal("B");
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(1000,200);
                        done();
                    }
                } catch(e) {
                    done(e);
                }
            });
            setTimeout(function() {
                // send test messages
                delayNode1.receive({payload:1});            // send something with blank topic
                delayNode1.receive({payload:1,topic:"A"});  // and something with a fixed topic
                delayNode1.receive({payload:1,topic:"B"});  // and something else with a fixed topic (3rd tick)
                delayNode1.receive({payload:2,topic:"A"});  // these should replace them in queue
                delayNode1.receive({payload:3,topic:"A"});  //  ditto
                delayNode1.receive({payload:2});            // so only this should get out on first tick
                delayNode1.receive({payload:4,topic:"A"});  // and this one on second tick
            }, 275);  // wait one tick beofre starting.. (to test no messages in queue path.)
        });
    });

    it('handles timed queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"timed","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "_none_") {
                        msg.payload.should.equal(2);
                        (Date.now() - t).should.be.approximately(500,200);
                    }
                    else if (msg.topic === "A") {
                        msg.payload.should.equal(4);
                        (Date.now() - t).should.be.approximately(500,200);
                    }
                    else {
                        msg.topic.should.equal("B");
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(500,200);
                        done();
                    }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            delayNode1.receive({payload:1});            // send something with blank topic
            delayNode1.receive({payload:1,topic:"A"});  // and something with a fixed topic
            delayNode1.receive({payload:1,topic:"B"});  // and something else with a fixed topic
            delayNode1.receive({payload:2,topic:"A"});  // these should replace them in queue
            delayNode1.receive({payload:3,topic:"A"});  //  ditto
            delayNode1.receive({payload:2});            // so all should go on first tick
            delayNode1.receive({payload:4,topic:"A"});  //  and nothing on second
        });
    });

    it('can flush delay queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"delay","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,100);
                        c = c + 1;
                    }
                    else {
                        if (msg.topic === "bar") {
                            msg.payload.should.equal(1);
                            (Date.now() - t).should.be.approximately(0,100);
                            c = c + 1;
                        }
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            delayNode1.receive({payload:1,topic:"foo"});            // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({flush:true});  });          // reset the queue
        });
    });

    it('can part flush delay queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"delay","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "bar") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(200,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "boo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(400,100);
                        c = c + 1;
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            delayNode1.receive({payload:1,topic:"foo"});
            setImmediate( function() { delayNode1.receive({payload:1,topic:"foo"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"boo"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"boo"}); }  );
            setImmediate( function() { delayNode1.receive({flush:2});  });
            setTimeout( function() { delayNode1.receive({flush:1});  }, 200);
            setTimeout( function() { delayNode1.receive({flush:4});  }, 400);
        });
    });

    it('can reset delay queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"delay","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                c = c + 1;
            });

            setTimeout( function() {
                if (c === 0) { done(); }
            }, 700);

            // send test messages
            delayNode1.receive({payload:1,topic:"foo"});            // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({reset:true});  });          // reset the queue
        });
    });

    it('can flush rate limit queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,100);
                        c = c + 1;
                    }
                    else {
                        if (msg.topic === "bar") {
                            msg.payload.should.equal(1);
                            (Date.now() - t).should.be.approximately(0,100);
                            c = c + 1;
                        }
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            delayNode1.receive({payload:1,topic:"foo"});            // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({flush:true});  });          // reset the queue
        });
    });

    it('can part flush rate limit queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "bar") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(200,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "boo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(400,100);
                        c = c + 1;
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            delayNode1.receive({payload:1,topic:"foo"});
            setImmediate( function() { delayNode1.receive({payload:1,topic:"foo"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"foo"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"boo"}); }  );
            setImmediate( function() { delayNode1.receive({flush:2});  });
            setTimeout( function() { delayNode1.receive({flush:1});  }, 200);
            setTimeout( function() { delayNode1.receive({flush:4});  }, 400);
        });
    });

    it('can part flush and reset rate limit queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":1,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"allowrate":false,"outputs":1,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                // console.log("GOT",Date.now() - t,msg)
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,50);
                        c = c + 1;
                    }
                    else if (msg.topic === "bar") {
                        msg.payload.should.equal(2);
                        (Date.now() - t).should.be.approximately(200,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "fob") {
                        msg.payload.should.equal(5);
                        (Date.now() - t).should.be.approximately(400,100);
                        c = 5;
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            // delayNode1.receive({payload:1,topic:"foo"});
            setImmediate( function() { delayNode1.receive({payload:1,topic:"foo"}); }  );
            setTimeout( function() { delayNode1.receive({payload:2,topic:"far"}); }, 10  );
            setTimeout( function() { delayNode1.receive({payload:3,topic:"boo"}); }, 20  );
            setTimeout( function() { delayNode1.receive({payload:4,topic:"bar"}); }, 30  );
            setTimeout( function() { delayNode1.receive({flush:2,reset:true});  }, 200);
            setTimeout( function() { delayNode1.receive({payload:5,topic:"fob"}); }, 300  );
            setTimeout( function() { delayNode1.receive({flush:1,reset:true});  }, 400);
        });
    });

    it('can full flush and reset rate limit queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":1,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"allowrate":false,"outputs":1,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                // console.log("GOT",Date.now() - t,msg)
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,50);
                        c = c + 1;
                    }
                    else if (msg.topic === "bar") {
                        msg.payload.should.equal(4);
                        (Date.now() - t).should.be.approximately(200,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "all") {
                        msg.payload.should.equal(5);
                        (Date.now() - t).should.be.approximately(200,100);
                        c = c + 1;
                    }
                    else if (msg.topic === "fob") {
                        msg.payload.should.equal(6);
                        (Date.now() - t).should.be.approximately(400,100);
                        c = 5;
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            // delayNode1.receive({payload:1,topic:"foo"});
            setImmediate( function() { delayNode1.receive({payload:1,topic:"foo"}); }  );
            setTimeout( function() { delayNode1.receive({payload:2,topic:"far"}); }, 10  );
            setTimeout( function() { delayNode1.receive({payload:3,topic:"boo"}); }, 20  );
            setTimeout( function() { delayNode1.receive({payload:4,topic:"bar"}); }, 30  );
            setTimeout( function() { delayNode1.receive({payload:5,topic:"last",flush:true,reset:true});  }, 200);
            setTimeout( function() { delayNode1.receive({payload:6,topic:"fob"}); }, 300  );
            setTimeout( function() { delayNode1.receive({flush:1,reset:true});  }, 400);
        });
    });

    it('can part push to front of rate limit queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":1,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "aoo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(2,50);
                        c = c + 1;
                    }
                    else if (msg.topic === "eoo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(4,50);
                        c = c + 1;
                    }
                    else if (msg.topic === "coo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(202,50);
                        c = c + 1;
                    }
                    else if (msg.topic === "boo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(406,50);
                        c = c + 1;
                    }
                    else if (msg.topic === "doo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(4,50);
                        c = c + 1;
                    }
                    if (c === 5) { done(); }
                } catch(e) {
                    done(e);
                }
            });

            // send test messages
            delayNode1.receive({payload:1,topic:"aoo"});
            setImmediate( function() { delayNode1.receive({payload:1,topic:"boo"}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"coo",toFront:true}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"doo",toFront:true,flush:1}); }  );
            setImmediate( function() { delayNode1.receive({payload:1,topic:"eoo",toFront:true}); }  );
            setImmediate( function() { delayNode1.receive({flush:1});  });
            setTimeout( function() { delayNode1.receive({flush:1});  }, 200);
            setTimeout( function() { delayNode1.receive({flush:4});  }, 400);
        });
    });

    it('can reset rate limit queue', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                msg.should.have.a.property('payload');
                msg.should.have.a.property('topic');
                try {
                    if (msg.topic === "foo") {
                        msg.payload.should.equal(1);
                        (Date.now() - t).should.be.approximately(0,100);
                        c = c + 1;
                    }
                } catch(e) {
                    done(e);
                }
            });

            setTimeout( function() {
                if (c === 1) { done(); }
            }, 700);

            // send test messages
            delayNode1.receive({payload:1,topic:"foo"});            // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({payload:1,topic:"bar"}); }  );          // send something with blank topic
            setImmediate( function() { delayNode1.receive({reset:true});  });          // reset the queue
        });
    });

    it('sending a msg with reset to empty queue doesnt send anything', function(done) {
        this.timeout(2000);
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":1,"timeoutUnits":"seconds","rate":2,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var t = Date.now();
            var c = 0;
            helperNode1.on("input", function(msg) {
                console.log("Shold not get here")
                done(e);
            });

            setTimeout( function() {
                if (c === 0) { done(); }
            }, 250);

            // send test messages
            delayNode1.receive({payload:1,topic:"foo",reset:true});            // send something with blank topic
        });
    });

    /* Messaging API support */
    function mapiDoneTestHelper(done, pauseType, drop, msgAndTimings) {
        const completeNode = require("nr-test-utils").require("@node-red/nodes/core/common/24-complete.js");
        const flow = [{id:"delayNode1",type:"delay",name:"delayNode", pauseType:pauseType, timeout:"1", timeoutUnits: "seconds",
                       rate: "1", nbRateUnits: "1", rateUnits: "second", randomFirst:"950", randomLast:"1050",randomUnits:"milliseconds",
                       drop: drop, wires: [[]]},
                      {id:"completeNode1",type:"complete",scope: ["delayNode1"],uncaught:false,wires:[["helperNode1"]]},
                      {id:"helperNode1",type:"helper", wires:[[]]}];
        const numMsgs = msgAndTimings.length;
        helper.load([delayNode, completeNode], flow, function () {
            const delayNode1 = helper.getNode("delayNode1");
            const helperNode1 = helper.getNode("helperNode1");
            const t = Date.now();
            let c = 0;
            helperNode1.on("input", function (msg) {
                msg.should.have.a.property('payload', msgAndTimings[c].msg.payload);
                (Date.now() - t).should.be.approximately(msgAndTimings[c].avr, msgAndTimings[c].var);
                c += 1;
                if ( c === numMsgs) {
                    done();
                }
            });
            for (let i = 0; i < numMsgs; i++) {
                setImmediate( function() { delayNode1.receive(msgAndTimings[i].msg); } );
            }
        });
    }

    it('calls done when queued message is emitted (type: delay)', function(done) {
        mapiDoneTestHelper(done, "delay", false, [{msg:{payload:1}, avr:1000, var:100}]);
    });
    it('calls done when queued message is emitted (type: delayv)', function(done) {
        mapiDoneTestHelper(done, "delayv", false, [{msg:{payload:1, delay:1000}, avr:1000, var:100}]);
    });
    it('calls done when queued message is emitted (type: delay)', function(done) {
        mapiDoneTestHelper(done, "random", false, [{msg:{payload:1}, avr:1000, var:100}]);
    });
    it('calls done when queued message is cleared (type: delay)', function(done) {
        mapiDoneTestHelper(done, "delay", false, [{msg:{payload:1}, avr:100, var:100},
                                                  {msg:{payload:2,reset:true}, avr:100, var:100}]);
    });
    it('calls done when queued message is cleared (type: delayv)', function(done) {
        mapiDoneTestHelper(done, "delayv", false, [{msg:{payload:1, delay:1000}, avr:100, var:100},
                                                   {msg:{payload:2, reset:true}, avr:100, var:100}]);
    });
    it('calls done when queued message is cleared (type: random)', function(done) {
        mapiDoneTestHelper(done, "random", false, [{msg:{payload:1}, avr:100, var:100},
                                                   {msg:{payload:2,reset:true}, avr:100, var:100}]);
    });
    it('calls done when queued message is flushed (type: delay)', function(done) {
        mapiDoneTestHelper(done, "delay", false, [{msg:{payload:1}, avr:100, var:100},
                                                  {msg:{payload:2,flush:true}, avr:100, var:100}]);
    });
    it('calls done when queued message is flushed (type: delayv)', function(done) {
        mapiDoneTestHelper(done, "delayv", false, [{msg:{payload:1, delay:1000}, avr:100, var:100},
                                                   {msg:{payload:2, flush:true}, avr:100, var:100}]);
    });
    it('calls done when queued message is flushed (type: random)', function(done) {
        mapiDoneTestHelper(done, "random", false, [{msg:{payload:1}, avr:100, var:100},
                                                  {msg:{payload:2,flush:true}, avr:100, var:100}]);
    });
    it('calls done when rated message is emitted (drop: false)', function(done) {
        mapiDoneTestHelper(done, "rate", false, [{msg:{payload:1}, avr:0, var:100},
                                                 {msg:{payload:2}, avr:1000, var:100}]);
    });
    it('calls done when rated message is emitted (drop: true)', function(done) {
        mapiDoneTestHelper(done, "rate", true, [{msg:{payload:1}, avr:0, var:100},
                                                {msg:{payload:2}, avr:0, var:100}]);
    });
    it('calls done when rated message is flushed', function(done) {
        mapiDoneTestHelper(done, "rate", false, [{msg:{payload:1}, avr:0, var:100},
                                                 {msg:{payload:2}, avr:0, var:100},
                                                 {msg:{payload:3,flush:true}, avr:0, var:100}]);
    });
    it('calls done when queued messages are sent (queue)', function(done) {
        this.timeout(3000);
        mapiDoneTestHelper(done, "queue", false, [{msg:{payload:1,topic:"A"}, avr:1000, var:700},
                                                  {msg:{payload:2,topic:"B"}, avr:2000, var:700}]);
    });
    it('calls done when queued messages are sent (timed)', function(done) {
        mapiDoneTestHelper(done, "timed", false, [{msg:{payload:1,topic:"a"}, avr:500, var:700},
                                                  {msg:{payload:2,topic:"b"}, avr:500, var:700}]);
    });
    it('calls done when queue is reset (queue/timed)', function(done) {
        mapiDoneTestHelper(done, "timed", false, [{msg:{payload:1,topic:"a"}, avr:0, var:500},
                                                  {msg:{payload:2,reset:true}, avr:0, var:500}]);
    });
    it('calls done when queue is flushed (queue/timed)', function(done) {
        mapiDoneTestHelper(done, "timed", false, [{msg:{payload:1,topic:"a"}, avr:0, var:500},
                                                  {msg:{payload:2,flush:true}, avr:0, var:500}]);
    });
});
