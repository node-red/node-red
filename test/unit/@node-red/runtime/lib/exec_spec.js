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
var events = require("events");


var child_process = require('child_process');

var NR_TEST_UTILS = require("nr-test-utils");

var exec = NR_TEST_UTILS.require("@node-red/runtime/lib/exec");

describe("runtime/exec", function() {
    var logEvents;
    var mockProcess;

    beforeEach(function() {
        var logEventHandler = new events.EventEmitter();
        logEvents = [];
        logEventHandler.on('event-log', function(ev) {
            logEvents.push(ev);
        });
        exec.init({events:logEventHandler});

        mockProcess = new events.EventEmitter();
        mockProcess.stdout = new events.EventEmitter();
        mockProcess.stderr = new events.EventEmitter();
        sinon.stub(child_process,'spawn',function(command,args,options) {
            mockProcess._args = {command,args,options};
            return mockProcess;
        });
    });

    afterEach(function() {
        if (child_process.spawn.restore) {
            child_process.spawn.restore();
        }
    });

    it("runs command and resolves on success - no emit", function(done) {
        var command = "cmd";
        var args = [1,2,3];
        var opts = { a: true };
        exec.run(command,args,opts).then(function(result) {
            command.should.eql(mockProcess._args.command);
            args.should.eql(mockProcess._args.args);
            opts.should.eql(mockProcess._args.options);
            logEvents.length.should.eql(0);
            result.code.should.eql(0);
            result.stdout.should.eql("123");
            result.stderr.should.eql("abc");
            done();
        }).catch(done);

        mockProcess.stdout.emit('data',"1");
        mockProcess.stderr.emit('data',"a");
        mockProcess.stderr.emit('data',"b");
        mockProcess.stdout.emit('data',"2");
        mockProcess.stdout.emit('data',"3");
        mockProcess.stderr.emit('data',"c");
        mockProcess.emit('close',0);
    });

    it("runs command and resolves on success - emit", function(done) {
        var command = "cmd";
        var args = [1,2,3];
        var opts = { a: true };
        exec.run(command,args,opts,true).then(function(result) {
            logEvents.length.should.eql(8);
            done();
        }).catch(done);

        mockProcess.stdout.emit('data',"1");
        mockProcess.stderr.emit('data',"a");
        mockProcess.stderr.emit('data',"b");
        mockProcess.stdout.emit('data',"2");
        mockProcess.stdout.emit('data',"3");
        mockProcess.stderr.emit('data',"c");
        mockProcess.emit('close',0);
    })

    it("runs command and rejects on error - close", function(done) {
        var command = "cmd";
        var args = [1,2,3];
        var opts = { a: true };
        exec.run(command,args,opts).then(function() {
            done("Command should have rejected");
        }).catch(function(result) {
            result
            result.code.should.eql(123);
            result.stdout.should.eql("123");
            result.stderr.should.eql("abc");
            done();
        }).catch(done);

        mockProcess.stdout.emit('data',"1");
        mockProcess.stderr.emit('data',"a");
        mockProcess.stderr.emit('data',"b");
        mockProcess.stdout.emit('data',"2");
        mockProcess.stdout.emit('data',"3");
        mockProcess.stderr.emit('data',"c");
        mockProcess.emit('close',123);
    })

    it("runs command and rejects on error - error", function(done) {
        var command = "cmd";
        var args = [1,2,3];
        var opts = { a: true };
        exec.run(command,args,opts).then(function() {
            done("Command should have rejected");
        }).catch(function(result) {
            result
            result.code.should.eql(456);
            result.stdout.should.eql("");
            result.stderr.should.eql("test-error");
            done();
        }).catch(done);

        mockProcess.emit('error',"test-error");
        mockProcess.emit('close',456);
    })

});
