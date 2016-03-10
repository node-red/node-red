/**
 * Copyright 2015 IBM Corp.
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
            done();
        });
    });

	describe('calling exec', function() {

		it('should exec a simple command', function(done) {
		    var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:false, append:""},
		                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
		    var spy = sinon.stub(child_process, 'exec',
		        function(arg1,arg2,arg3,arg4){
		            //console.log(arg1);
		            // arg3(error,stdout,stderr);
		            arg3(null,arg1,arg1.toUpperCase());
		        });

		    helper.load(execNode, flow, function() {
		        var n1 = helper.getNode("n1");
		        var n2 = helper.getNode("n2");
		        var n3 = helper.getNode("n3");
		        var n4 = helper.getNode("n4");
		        n2.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("echo");
		        });
		        n3.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("ECHO");
		            done();
		            child_process.exec.restore();
		        });
		        n1.receive({payload:"and"});
		    });
		});

		it('should exec a simple command with extra parameters', function(done) {
		    var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"more"},
		                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
		    var spy = sinon.stub(child_process, 'exec',
		        function(arg1,arg2,arg3,arg4){
		            //console.log(arg1);
		            // arg3(error,stdout,stderr);
		            arg3(null,arg1,arg1.toUpperCase());
		        });

		    helper.load(execNode, flow, function() {
		        var n1 = helper.getNode("n1");
		        var n2 = helper.getNode("n2");
		        var n3 = helper.getNode("n3");
		        var n4 = helper.getNode("n4");
		        n2.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("echo and more");
		        });
		        n3.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("ECHO AND MORE");
		            done();
		            child_process.exec.restore();
		        });
		        n1.receive({payload:"and"});
		    });
		});

		it('should be able to return a binary buffer', function(done) {
		    var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:"more"},
		                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
		    var spy = sinon.stub(child_process, 'exec',
		        function(arg1,arg2,arg3,arg4){
		            //console.log(arg1);
		            // arg3(error,stdout,stderr);
		            arg3("error",new Buffer([0x01,0x02,0x03]),"");
		        });

		    helper.load(execNode, flow, function() {
		        var n1 = helper.getNode("n1");
		        var n2 = helper.getNode("n2");
		        var n3 = helper.getNode("n3");
		        var n4 = helper.getNode("n4");
		        n2.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.Buffer;
		            msg.payload.length.should.equal(3);
		        });
		        n4.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("error");
		            done();
		            child_process.exec.restore();
		        });
		        n1.receive({payload:"and"});
		    });
		});
	});

	describe.skip('calling spawn', function() {

		it('should spawn a simple command', function(done) {
		    var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true
		        , append:"", useSpawn:true},
		                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
		    var events = require('events');
		    //var spy = sinon.stub(child_process, 'spawn',
		        //function(arg1,arg2) {
		            //console.log(arg1,arg2);
		            //var blob = new events.EventEmitter;

		            //blob.stdout = function() { blob.emit("data","A"); }
		            //blob.stderr = function() { blob.emit("data","B"); }

		            //console.log("blob",blob);
		            //setTimeout( function() {
		                //blob.emit("close","CLOSE");
		            //},150);

		            //return blob;
		        //});

		    helper.load(execNode, flow, function() {
		        var n1 = helper.getNode("n1");
		        var n2 = helper.getNode("n2");
		        var n3 = helper.getNode("n3");
		        var n4 = helper.getNode("n4");
		        n2.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("hello world\n");
		            done();
		            //child_process.spawn.restore();
		        });
		        n1.receive({payload:"hello world"});
		    });
		});

		it('should spawn a simple command with a non string payload parameter', function(done) {
		    var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo", addpay:true, append:" deg C", useSpawn:true},
		                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
		    //var spy = sinon.stub(child_process, 'spawn',
		        //function(arg1,arg2) {
		            //console.log(arg1,arg2);
		            ////console.log(this);
		            //// arg3(error,stdout,stderr);
		            ////arg3(null,arg1,arg1.toUpperCase());
		        //});

		    helper.load(execNode, flow, function() {
		        var n1 = helper.getNode("n1");
		        var n2 = helper.getNode("n2");
		        var n3 = helper.getNode("n3");
		        var n4 = helper.getNode("n4");
		        n2.on("input", function(msg) {
		            //console.log(msg);
		            msg.should.have.property("payload");
		            msg.payload.should.be.a.String.and.equal("12345 deg C\n");
		            done();
		        });
		        n1.receive({payload:12345});
		    });
		});

		it('should error if passed multiple words to spawn command', function(done) {
		    var flow = [{id:"n1",type:"exec",wires:[["n2"],["n3"],["n4"]],command:"echo this wont work", addpay:false, append:"", useSpawn:true},
		                {id:"n2", type:"helper"},{id:"n3", type:"helper"},{id:"n4", type:"helper"}];
		    helper.load(execNode, flow, function() {
		        var n1 = helper.getNode("n1");
		        var n2 = helper.getNode("n2");
		        var n3 = helper.getNode("n3");
		        var n4 = helper.getNode("n4");
		        setTimeout(function() {
		            var logEvents = helper.log().args.filter(function(evt) {
		                return evt[0].type == "exec";
		            });
		            //console.log(logEvents);
		            logEvents.should.have.length(1);
		            logEvents[0][0].should.have.a.property('msg');
		            logEvents[0][0].msg.toString().should.startWith("Spawn command");
		            done();
		        },150);
		        n1.receive({payload:null});
		    });
		});
	});

});
