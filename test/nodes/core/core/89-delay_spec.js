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

var delayNode = require("../../../../nodes/core/core/89-delay.js");
var helper = require("../../helper.js");

var GRACE_PERCENTAGE=10;

var nanosToSeconds = 1000000000;
var millisToSeconds = 1000;

var secondsToMinutes = 60;
var secondsToHours = 3600;
var secondsToDays = 86400;


describe('delayNode', function() {
    
    beforeEach(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function(done) {
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"delay","timeout":"5","timeoutUnits":"seconds","rate":"1","rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[[]]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            delayNode1.should.have.property('name', 'delayNode');
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
        
        if(actualValue >= minExpected && actualValue <= maxExpected) {
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
                    if(aTimeoutUnit == TimeUnitEnum.MILLIS) {
                        aTimeoutUnifiedToSeconds = aTimeout / millisToSeconds;
                    } else if(aTimeoutUnit == TimeUnitEnum.SECONDS) {
                        aTimeoutUnifiedToSeconds = aTimeout;
                    } else if(aTimeoutUnit == TimeUnitEnum.MINUTES) {
                        aTimeoutUnifiedToSeconds = aTimeout * secondsToMinutes;
                    } else if(aTimeoutUnit == TimeUnitEnum.HOURS) {
                        aTimeoutUnifiedToSeconds = aTimeout * secondsToHours;
                    } else if(aTimeoutUnit == TimeUnitEnum.DAYS) {
                        aTimeoutUnifiedToSeconds = aTimeout * secondsToDays;
                    }
                    
                    if(closeEnough(runtimeSeconds, aTimeoutUnifiedToSeconds, GRACE_PERCENTAGE)) {
                        done();
                    } else {
                        try {
                            should.fail(null, null, "Delayed runtime seconds " +  runtimeSeconds + " was not close enough to exlected timeout seconds: " + aTimeoutUnifiedToSeconds);
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
     * @param runtimeInMillis - when to terminate run and count messages received
     */
    function genericRateLimitSECONDSTest(aLimit, runtimeInMillis, done) {
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":5,"timeoutUnits":"seconds","rate":aLimit,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var receivedMessagesStack = [];
            var rate = 1000/aLimit;
            
            var receiveTimestamp;
            
            helperNode1.on("input", function(msg) {
                if(receiveTimestamp) {
                    var elapse = process.hrtime(receiveTimestamp);
                    var receiveInterval = (elapse[0] * 1000) + ((elapse[1] / nanosToSeconds) * 1000);
                    receiveInterval.should.be.above(rate * 0.9);
                }
                receiveTimestamp = process.hrtime();
                receivedMessagesStack.push(msg);
            });
            
            var possibleMaxMessageCount = Math.ceil(aLimit * (runtimeInMillis / 1000) + aLimit); // +aLimit as at the start of the 2nd period, we're allowing the 3rd burst
            
            var i = 0;
            for(; i < possibleMaxMessageCount + 1; i++) {
                delayNode1.receive({payload:i});
            }
            
            setTimeout(function() {
                try {
                    receivedMessagesStack.length.should.be.lessThan(possibleMaxMessageCount);
                    for(var j = 0; j < receivedMessagesStack.length; j++) {
                        if(receivedMessagesStack[j].payload === j) {
                            if(j === (receivedMessagesStack.length -1)) { // last message, all matched so far
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
        genericRateLimitSECONDSTest(1, 1500, done);
    });
    
    it('limits the message rate to 2 per second, 2 seconds', function(done) {
        this.timeout(6000);
        genericRateLimitSECONDSTest(2, 2100, done);
    });
    
    /**
     * Runs a rate limit test with drop support - only testing seconds!
     * @param aLimit - the message limit count
     * @param runtimeInMillis - when to terminate run and count messages received
     */
    function dropRateLimitSECONDSTest(aLimit, runtimeInMillis, done) {
        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":5,"timeoutUnits":"seconds","rate":aLimit,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":true,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var receivedMessagesStack = [];
            
            var rate = 1000/aLimit;
            
            var receiveTimestamp;
            
            helperNode1.on("input", function(msg) {
                if(receiveTimestamp) {
                    var elapse = process.hrtime(receiveTimestamp);
                    var receiveInterval = (elapse[0] * 1000) + ((elapse[1] / nanosToSeconds) * 1000);
                    receiveInterval.should.be.above(rate * 0.9);
                }
                receiveTimestamp = process.hrtime();
                receivedMessagesStack.push(msg);
            });
            
            var possibleMaxMessageCount = Math.ceil(aLimit * (runtimeInMillis / 1000) + aLimit); // +aLimit as at the start of the 2nd period, we're allowing the 3rd burst
            
            var i = 0;
            delayNode1.receive({payload:i});
            i++;
            for(; i < possibleMaxMessageCount + 1; i++) {
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
                    for(var i = 0; i < receivedMessagesStack.length; i++) {
                        if(i > 0) {
                            if(receivedMessagesStack[i].payload - receivedMessagesStack[i - 1].payload > 1) {
                                foundAtLeastOneDrop = true;
                            }
                        }
                    }
                    foundAtLeastOneDrop.should.be.true;
                    done();
                } catch (err) {
                    done(err);
                }
            }, runtimeInMillis);
        });
    }
    
    it('limits the message rate to 1 per second, 4 seconds, with drop', function(done) {
        this.timeout(6000);
        dropRateLimitSECONDSTest(1, 4000, done);
    });
    
    it('limits the message rate to 2 per second, 5 seconds, with drop', function(done) {
        this.timeout(6000);
        dropRateLimitSECONDSTest(2, 5000, done);
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
        if(closeEnough(actualTimeout, timeoutFrom, allowedGracePercent)) {
            return true;
        } else if(closeEnough(actualTimeout, timeoutTo, allowedGracePercent)) {
            return true;
        } else if(timeoutFrom < actualTimeout && timeoutTo > actualTimeout) {
            return true;
        } else {
            return false;
        }
    }
    
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
                    if(aTimeoutUnit == TimeUnitEnum.MILLIS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom / millisToSeconds;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo / millisToSeconds;
                    } else if(aTimeoutUnit == TimeUnitEnum.SECONDS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo;
                    } else if(aTimeoutUnit == TimeUnitEnum.MINUTES) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToMinutes;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToMinutes;
                    } else if(aTimeoutUnit == TimeUnitEnum.HOURS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToHours;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToHours;
                    } else if(aTimeoutUnit == TimeUnitEnum.DAYS) {
                        aTimeoutFromUnifiedToSeconds = aTimeoutFrom * secondsToDays;
                        aTimeoutToUnifiedToSeconds = aTimeoutTo * secondsToDays;
                    }
                    
                    if(inBetweenDelays(aTimeoutFromUnifiedToSeconds, aTimeoutToUnifiedToSeconds, runtimeSeconds, GRACE_PERCENTAGE)) {
                        done();
                    } else {
                        try {
                            should.fail(null, null, "Delayed runtime seconds " +  runtimeSeconds + " was not \"in between enough\" enough to expected values of: " + aTimeoutFromUnifiedToSeconds + " and " + aTimeoutToUnifiedToSeconds);
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
    
    it(' randomly delays the message in milliseconds', function(done) {
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
    
    it('handles bursts using a buffer', function(done) {
        this.timeout(6000);

        var flow = [{"id":"delayNode1","type":"delay","name":"delayNode","pauseType":"rate","timeout":5,"timeoutUnits":"seconds","rate":1000,"rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(delayNode, flow, function() {
            var delayNode1 = helper.getNode("delayNode1");
            var helperNode1 = helper.getNode("helperNode1");
            
            var sinon = require('sinon');
            
            var receivedWarning = false;
            var messageBurstSize = 1500;
            
            // we ensure that we note that a warning is received for buffer growth
            sinon.stub(delayNode1, 'warn', function(warning){
                if(warning.indexOf("buffer exceeded 1000 messages" > -1)) {
                    receivedWarning = true;
                }
            });
            
            // we ensure that the warning is received for buffer size and that we get the last message
            helperNode1.on("input", function(msg) {
                if(msg.payload === (messageBurstSize - 1) && receivedWarning === true) {
                    done(); // it will timeout if we don't receive the last message
                }
            });
            // send 1500 messages as quickly as possible
            for(var i = 0; i < messageBurstSize; i++) {
                delayNode1.receive({payload:i});   
            }
        });
    });
    
});
