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
var sinon = require("sinon");
var util = require("util");

describe("red/log", function() {
    it('can be required without errors', function() {
        require("../../red/log");
    });

    var log = require("../../red/log");
    var sett = {logging: { console: { level: 'metric', metrics: true } } };
    log.init(sett);

    beforeEach(function () {
        var spy = sinon.spy(util, 'log');
    });

    afterEach(function() {
        util.log.restore();
    });

    it('it can raise an error', function() {
        var ret = log.error("This is an error");
        sinon.assert.calledWithMatch(util.log,"");
    });

    it('it can raise a trace', function() {
        var ret = log.trace("This is a trace");
        sinon.assert.calledWithMatch(util.log,"");
    });

    it('it can raise a debug', function() {
        var ret = log.debug("This is a debug");
        sinon.assert.calledWithMatch(util.log,"");
    });

    it('it checks level of metrics', function() {
        log.metric().should.equal(true);
    });
});
