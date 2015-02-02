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
var sinon = require('sinon');
var log = require("../../red/log");
var util = require("util");

describe("red/log", function() {

    beforeEach(function() {
        sinon.spy(util,"log");
    });
    
    afterEach(function() {
        util.log.restore();
    });
    
    it('should record fatal log message if loglevel is fatal', function(done) {
        var settings = {logLevel:"fatal"};
        log.init(settings);
        var msg = {level:"fatal"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should not record error log message if loglevel is fatal', function(done) {
        var settings = {logLevel:"fatal"};
        log.init(settings);
        var msg = {level:"error"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });

    it('should record error log message if loglevel is error', function(done) {
        var settings = {logLevel:"error"};
        log.init(settings);
        var msg = {level:"error"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should record fatal log message if loglevel is error', function(done) {
        var settings = {logLevel:"error"};
        log.init(settings);
        var msg = {level:"fatal"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should not record warn log message if loglevel is error', function(done) {
        var settings = {logLevel:"error"};
        log.init(settings);
        var msg = {level:"warn"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });
 
    it('should record warn log message if loglevel is warn', function(done) {
        var settings = {logLevel:"warn"};
        log.init(settings);
        var msg = {level:"warn"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should record error log message if loglevel is warn', function(done) {
        var settings = {logLevel:"warn"};
        log.init(settings);
        var msg = {level:"error"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });

    it('should not record info log message if loglevel is warn', function(done) {
        var settings = {logLevel:"warn"};
        log.init(settings);
        var msg = {level:"info"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });
    
    it('should record info log message if loglevel is info', function(done) {
        var settings = {logLevel:"info"};
        log.init(settings);
        var msg = {level:"info"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });

    it('should record warn log message if loglevel is info', function(done) {
        var settings = {logLevel:"info"};
        log.init(settings);
        var msg = {level:"warn"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });

    it('should not record debug log message if loglevel is info', function(done) {
        var settings = {logLevel:"info"};
        log.init(settings);
        var msg = {level:"debug"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });
    
    it('should record debug log message if loglevel is debug', function(done) {
        var settings = {logLevel:"debug"};
        log.init(settings);
        var msg = {level:"debug"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
 
    it('should record info log message if loglevel is debug', function(done) {
        var settings = {logLevel:"debug"};
        log.init(settings);
        var msg = {level:"info"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should not record trace log message if loglevel is debug', function(done) {
        var settings = {logLevel:"debug"};
        log.init(settings);
        var msg = {level:"trace"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });
    
    it('should record trace log message if loglevel is trace', function(done) {
        var settings = {logLevel:"trace"};
        log.init(settings);
        var msg = {level:"trace"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should record debug log message if loglevel is trace', function(done) {
        var settings = {logLevel:"trace"};
        log.init(settings);
        var msg = {level:"debug"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should record metric information if metricsOn is true', function(done) {
        var settings = {metricsOn:true};
        log.init(settings);
        var msg = {level:"metric"};
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
    it('should not record metric information if metricsOn is false', function(done) {
        var settings = {metricsOn:false};
        log.init(settings);
        var msg = {level:"metric"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });
    
    it('should default to metricsOn:false', function(done) {
        var settings = {};
        log.init(settings);
        var msg = {level:"metric"};
        log.log(msg);
        util.log.callCount.should.be.exactly(0);
        done();
    });
    
    it('should default to logLevel info', function(done) {
        var settings = {};
        log.init(settings);
        var msg = {level:"info"}; // should be recorded
        log.log(msg);
        util.log.callCount.should.be.exactly(1);
        done();
    });
    
});
