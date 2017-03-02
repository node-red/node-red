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
var helper = require("../../helper.js");
var execNode = require("../../../../nodes/core/core/75-exec.js");

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
            done();
        });
    });

    describe('calling exec', function() {

        it('should exec a simple command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:false, append:""},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
            function(arg1,arg2,arg3,arg4) {
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
                var messages = [null,null,null];
                var completeTest = function() {
                    received++;
                    if (received < 3) {
                        return;
                    }
                    try{
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("echo");

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String,
                        msg.payload.should.equal("ECHO");

                        msg = messages[2];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",0);

                        child_process.exec.restore();
                        done();
                    } catch(err) {
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
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"more"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
                function(arg1,arg2,arg3,arg4) {
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
                    try{
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("echo and more");

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("ECHO AND MORE");
                        child_process.exec.restore();
                        done();
                    } catch(err) {
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
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"more"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
                function(arg1,arg2,arg3,arg4) {
                    //console.log(arg1);
                    // arg3(error,stdout,stderr);
                    arg3("error",new Buffer([0x01,0x02,0x03,0x88]));
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
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"0.3"},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    msg.should.have.property("payload");
                    msg.payload.should.have.property("killed",true);
                    //done();
                });
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "exec";
                    });
                    var i = logEvents.length - 1;
                    //logEvents.should.have.length(1);
                    logEvents[i][0].should.have.a.property('msg');
                    logEvents[i][0].msg.toString().should.startWith("Exec node timeout");
                    done();
                },400);
                n1.receive({});
            });
        });


        it('should return the rc for a failing command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"error", addpay:false, append:""},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            var spy = sinon.stub(child_process, 'exec',
            function(arg1,arg2,arg3,arg4) {
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
                    try{
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("error");

                        msg = messages[1];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String,
                        msg.payload.should.equal("ERROR");

                        msg = messages[2];
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("code",1);

                        child_process.exec.restore();
                        done();
                    } catch(err) {
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

    });

    describe('calling spawn', function() {

        it('should spawn a simple command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"", useSpawn:true},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
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
                        msg.payload.should.equal("hello world\n");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"hello world"});
            });
        });

        it('should spawn a simple command with a non string payload parameter', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:" deg C", useSpawn:true},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    //console.log(msg);
                    msg.should.have.property("payload");
                    msg.payload.should.be.a.String();
                    msg.payload.should.equal("12345 deg C\n");
                    done();
                });
                n1.receive({payload:12345});
            });
        });

        it('should spawn a simple command and return binary buffer', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"", useSpawn:true},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];

            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property("payload");
                        Buffer.isBuffer(msg.payload).should.be.true();
                        msg.payload.length.should.equal(7);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:new Buffer([0x01,0x02,0x03,0x88])});
            });
        });

        it('should work if passed multiple words to spawn command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo this now works", addpay:false, append:"", useSpawn:true},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
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
                    try{
                        var msg = messages[0];
                        msg.should.have.property("payload");
                        msg.payload.should.be.a.String();
                        msg.payload.should.equal("this now works\n");

                        msg = messages[1];
                        msg.should.have.property("payload");
                        should.exist(msg.payload);
                        msg.payload.should.be.a.Number();
                        msg.payload.should.equal(0);
                        done();
                    } catch(err) {
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

        if (!/^v0.10/.test(process.version)) {
            it('should return an error for a bad command', function(done) {
                var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"madeupcommandshouldfail", addpay:false, append:"", useSpawn:true},
                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
                helper.load(execNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    var n3 = helper.getNode("n3");
                    var n4 = helper.getNode("n4");
                    n4.on("input", function(msg) {
                        if (/^v0.10/.test(process.version)) {
                            msg.should.have.property("payload");
                            msg.payload.should.be.a.Number();
                            msg.payload.should.be.below(0);
                        } else {
                            msg.should.have.property("payload");
                            msg.payload.should.be.a.Number();
                            msg.payload.should.be.below(0);
                        }
                        done();
                    });
                    n1.receive({payload:null});
                });
            });
        }

        it('should return an error for a failing command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"mkdir /foo/bar/doo/dah", addpay:false, append:"", useSpawn:true},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n3.on("input", function(msg) {
                    msg.should.have.property("payload");
                    msg.payload.should.be.a.String();
                    msg.payload.should.equal("mkdir: /foo/bar/doo: No such file or directory\n");
                });
                n4.on("input", function(msg) {
                    msg.should.have.property("payload",1);
                    done();
                });
                n1.receive({payload:null});
            });
        });

        it('should be able to timeout a long running command', function(done) {
            var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"sleep", addpay:false, append:"1", timer:"0.3", useSpawn:true},
                        {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
            helper.load(execNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var n3 = helper.getNode("n3");
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    msg.should.have.property("payload",null);
                    //done();
                });
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "exec";
                    });
                    var i = logEvents.length - 1;
                    logEvents[i][0].should.have.a.property('msg');
                    logEvents[i][0].msg.toString().should.startWith("Exec node timeout");
                    done();
                },400);
                n1.receive({});
            });
        });

    });
});
