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
var helper = require("node-red-node-test-helper");
var execNode = require("nr-test-utils").require("@node-red/nodes/core/function/90-exec.js");
var osType = require("os").type();

var child_process = require('child_process');

describe('exec node', function() {

    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload().then(function() {
            helper.stopServer(done);
        });
    });

    it('should be loaded with any defaults', function(done) {
        var flow = [{id:"n1", type:"exec", name: "exec1"}];
        helper.load(execNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property("name", "exec1");
            n1.should.have.property("cmd", "");
            n1.should.have.property("append", "");
            n1.should.have.property("addpay",true);
            n1.should.have.property("timer",0);
            n1.should.have.property("oldrc","false");
            done();
        });
    });

    describe('calling exec', function() {

        it('should exec a simple command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:false, append:"", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
            function(arg1, arg2, arg3, arg4) {
                // arg3(error,stdout,stderr);
                arg3(null,arg1,arg1.toUpperCase());
            });

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null,null];
                var completeTest = function() {
                    received = received + 1;
                    if (received < 3) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("echo");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",0);

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("ECHO");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",0);

                        msg = messages[2];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",0);

                        child_process.exec.restore();
                        done();
                    }
                    catch(err) {
                        child_process.exec.restore();
                        done(err);
                    }
                };
                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n3.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[2] = msg;
                    completeTest();
                });
                n1.receive({payload:"and"});
            });
        });

        it('should exec a simple command with extra parameters', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"more", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
                function(arg1, arg2, arg3, arg4) {
                    //console.log(arg1);
                    // arg3(error,stdout,stderr);
                    arg3(null,arg1,arg1.toUpperCase());
                });

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null];
                var completeTest = function() {
                    received++;
                    if (received < 2) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("echo and more");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",0);

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("ECHO AND MORE");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",0);
                        child_process.exec.restore();
                        done();
                    }
                    catch(err) {
                        child_process.exec.restore();
                        done(err);
                    }
                };
                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n3.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n1.receive({payload:"and"});
            });
        });

        it('should be able to return a binary buffer', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"more", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
                function(arg1, arg2, arg3, arg4) {
                    //console.log(arg1);
                    // arg3(error,stdout,stderr);
                    arg3("error",Buffer.from([0x01,0x02,0x03,0x88]),Buffer.from([0x01,0x02,0x03,0x88]));
                });
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    //console.log("n2",msg);
                    try {
                        msg.should.have.property("payload");
                        Buffer.isBuffer(msg.payload).should.be.true();
                        msg.payload.length.should.equal(4);
                        child_process.exec.restore();
                        done();
                    } catch(err) {
                        child_process.exec.restore();
                        done(err);
                    }
                });
                n1.receive({});
            });
        });

        it('should be able to timeout a long running command', function(done) {
            var flow;
            if (osType === "Windows_NT") {
                // Although Windows timeout command is equivalent to sleep, this cannot be used because it promptly outputs a message.
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping", addpay:false, append:"192.0.2.0 -n 1 -w 1000 > NUL", timer:"0.3", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"0.3", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("signal","SIGTERM");
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({});
            });
        });

        it('should be able to kill a long running command', function(done) {
            var flow;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping", addpay:false, append:"192.0.2.0 -n 1 -w 1000 > NUL", timer:"2", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"2", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",null);
                        msg.rc.should.have.property("signal","SIGTERM");
                    } catch(err) { done(err); }
                });
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("signal","SIGTERM");
                        done();
                    }
                    catch(err) { done(err); }
                });
                setTimeout(function() {
                    n1.receive({kill:""});
                },150);
                n1.receive({});
            });
        });

        it('should be able to kill a long running command - SIGINT', function(done) {
            var flow;
            var sig = "SIGINT";
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping", addpay:false, append:"192.0.2.0 -n 1 -w 1000 > NUL", timer:"2", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"2", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",null);
                        msg.rc.should.have.property("signal","SIGINT");
                    } catch(err) { done(err); }
                });
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("signal",sig);
                        done();
                    } catch(err) { done(err); }
                });
                setTimeout(function() {
                    n1.receive({kill:"SIGINT"});
                },150);
                n1.receive({});
            });
        });

        it('should return the rc for a failing command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"error", addpay:false, append:"", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
            function(arg1, arg2, arg3, arg4) {
                //console.log(arg1);
                // arg3(error,stdout,stderr);
                arg3({code: 1},arg1,arg1.toUpperCase());
            });
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null,null];
                var completeTest = function() {
                    received++;
                    if (received < 3) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("error");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",1);
                        msg.rc.should.have.property("message",undefined);

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("ERROR");

                        msg = messages[2];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",1);

                        child_process.exec.restore();
                        done();
                    }
                    catch(err) {
                        child_process.exec.restore();
                        done(err);
                    }
                };
                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n3.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[2] = msg;
                    completeTest();
                });
                n1.receive({payload:"and"});
            });
        });

        it('should preserve existing properties on msg object', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:false, append:"", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
            function(arg1, arg2, arg3, arg4) {
                // arg3(error,stdout,stderr);
                arg3(null,arg1,arg1.toUpperCase());
            });

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null,null];
                var completeTest = function() {
                    received = received + 1;
                    if (received < 3) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("echo");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",0);
                        msg.should.have.property("foo","bar");

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("ECHO");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",0);
                        msg.should.have.property("foo","bar");

                        msg = messages[2];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",0);
                        msg.should.have.property("foo","bar");

                        child_process.exec.restore();
                        done();
                    }
                    catch(err) {
                        child_process.exec.restore();
                        done(err);
                    }
                };
                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n3.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[2] = msg;
                    completeTest();
                });
                n1.receive({payload:"and", foo:"bar"});
            });
        });

        it('should preserve existing properties on msg object for a failing command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"error", addpay:false, append:"", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
            function(arg1, arg2, arg3, arg4) {
                // arg3(error,stdout,stderr);
                arg3({code: 1},arg1,arg1.toUpperCase());
            });
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null,null];
                var completeTest = function() {
                    received++;
                    if (received < 3) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("error");
                        msg.should.have.property("rc");
                        msg.rc.should.have.property("code",1);
                        msg.rc.should.have.property("message",undefined);
                        msg.should.have.property("foo",null);

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("ERROR");
                        msg.should.have.property("foo",null);

                        msg = messages[2];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",1);
                        msg.should.have.property("foo",null);

                        child_process.exec.restore();
                        done();
                    }
                    catch(err) {
                        child_process.exec.restore();
                        done(err);
                    }
                };
                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n3.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[2] = msg;
                    completeTest();
                });
                n1.receive({payload:"and", foo:null});
            });
        });

    });

    describe('calling spawn', function() {

        it('should spawn a simple command', function(done) {
            var flow;
            var expected;
            if (osType === "Windows_NT") {
                // Need to use cmd to spawn a process because Windows echo command is a built-in command and cannot be spawned.
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"cmd /C echo", addpay:true, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "hello world\r\n";
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "hello world\n";
            }
            var events = require('events');

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    //console.log(msg);
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal(expected);
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({payload:"hello world"});
            });
        });

        it('should spawn a simple command with a non string payload parameter', function(done) {
            var flow;
            var expected;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"cmd /C echo", addpay:true, append:" deg C", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "12345 deg C\r\n";
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:" deg C", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "12345 deg C\n";
            }

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    //console.log(msg);
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal(expected);
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({payload:12345});
            });
        });

        it('should spawn a simple command and return binary buffer', function(done) {
            var flow;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"cmd /C echo", addpay:true, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        Buffer.isBuffer(msg.payload).should.be.true();
                        if (osType === "Windows_NT") {
                            msg.payload.length.should.equalOneOf(6,8);
                        } else {
                            msg.payload.length.should.equal(7);
                        }
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({payload:Buffer.from([0x01,0x02,0x03,0x88])});
            });
        });

        it('should work if passed multiple words to spawn command', function(done) {
            var flow;
            var expected;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"cmd /C echo this now works", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "this now works\r\n";
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo this now works", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "this now works\n";
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null];
                var completeTest = function() {
                    received++;
                    if (received < 2) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal(expected);

                        msg = messages[1];
                        msg.should.have.property("payload");
                        should.exist(msg.payload);
                        msg.payload.should.have.property("code",0);
                        done();
                    }
                    catch(err) {
                        done(err);
                    }
                };

                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n1.receive({payload:null,fred:123});
            });
        });

        it('should return an error for a bad command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"madeupcommandshouldfail", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code");
                        msg.payload.code.should.be.below(0);
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({payload:null});
            });
        });

        it('should return an error for a failing command', function(done) {
            var flow;
            var expected;
            var expectedFound = false;
            if (osType === "Windows_NT") {
                // Cannot use mkdir because Windows mkdir command automatically creates non-existent directories.
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping /foo/bar/doo/dah", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "IP address must be specified.";
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"mkdir /foo/bar/doo/dah", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = ' directory';
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n3.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        if (msg.payload.indexOf(expected) >= 0) {
                            // The error text on the stderr stream might get sent in more than one piece.
                            // We only need to know that it occurred before the return code is sent,
                            // as checked below in node n4.
                            expectedFound = true;
                        }
                    }
                    catch(err) { done(err); }
                });
                n4.on("input", function(msg) {
                    try {
                        expectedFound.should.be.true;
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",1);
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({payload:null});
            });
        });

        it('should be able to timeout a long running command', function(done) {
            var flow;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping", addpay:false, append:"192.0.2.0 -n 1 -w 1000", timer:"0.3", useSpawn:"true", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"0.3", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",null);
                        msg.payload.should.have.property("signal","SIGTERM");
                        done();
                    }
                    catch(err) { done(err); }
                });
                n1.receive({});
            });
        });

        it('should be able to kill a long running command', function(done) {
            var flow;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping", addpay:false, append:"192.0.2.0 -n 1 -w 1000 > NUL", timer:"2", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"2", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("signal","SIGTERM");
                        done();
                    }
                    catch(err) { done(err); }
                });
                setTimeout(function() {
                    n1.receive({kill:""});
                },150);
                n1.receive({});
            });
        });

        it('should be able to kill a long running command - SIGINT', function(done) {
            var flow;
            var sig = "SIGINT";
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping", addpay:false, append:"192.0.2.0 -n 1 -w 1000 > NUL", timer:"2", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"2", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("signal",sig);
                        done();
                    }
                    catch(err) { done(err); }
                });
                setTimeout(function() {
                    n1.receive({kill:"SIGINT"});
                },150);
                n1.receive({});
            });
        });

        it('should preserve existing properties on msg object', function(done) {
            var flow;
            var expected;
            if (osType === "Windows_NT") {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"cmd /C echo this now works", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "this now works\r\n";
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo this now works", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "this now works\n";
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null];
                var completeTest = function() {
                    received++;
                    if (received < 2) {
                        return;
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal(expected);
                        msg.should.have.property("foo",123);

                        msg = messages[1];
                        msg.should.have.property("payload");
                        should.exist(msg.payload);
                        msg.payload.should.have.property("code",0);
                        msg.should.have.property("foo",123);

                        done();
                    }
                    catch(err) {
                        done(err);
                    }
                };

                n2.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n1.receive({payload:null,foo:123});
            });
        });

        it('should preserve existing properties on msg object for a failing command', function(done) {
            var flow;
            var expected;
            if (osType === "Windows_NT") {
                // Cannot use mkdir because Windows mkdir command automatically creates non-existent directories.
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"ping /foo/bar/doo/dah", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = "IP address must be specified.";
            } else {
                flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"mkdir /foo/bar/doo/dah", addpay:false, append:"", useSpawn:"true", oldrc:"false"},
                            {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                expected = ' directory';
            }
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                var received = 0;
                var messages = [null,null];
                var completeTest = function() {
                    if (messages[0] === null || messages[1] === null) {
                        // We have not yet had responses on both ports.
                        return
                    }
                    try {
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.should.have.property("foo","baz");

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",1);
                        msg.should.have.property("foo","baz");

                        done();
                    }
                    catch(err) {
                        done(err);
                    }
                };

                n3.on("input", function(msg) {
                    messages[0] = msg;
                    completeTest();
                });
                n4.on("input", function(msg) {
                    messages[1] = msg;
                    completeTest();
                });
                n1.receive({payload:null,foo:"baz"});
            });
        });

    });
});
