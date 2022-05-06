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
 var tomlNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-TOML.js");
 var helper = require("node-red-node-test-helper");
 
 describe('TOML node', function() {
 
     before(function(done) {
         helper.startServer(done);
     });
 
     after(function(done) {
         helper.stopServer(done);
     });
 
     afterEach(function() {
         helper.unload();
     });
 
     it('should be loaded', function(done) {
         var flow = [{id:"tomlNode1", type:"toml", name: "tomlNode" }];
         helper.load(tomlNode, flow, function() {
             var tomlNode1 = helper.getNode("tomlNode1");
             tomlNode1.should.have.property('name', 'tomlNode');
             done();
         });
     });
 
     it('should convert a valid toml string to a javascript object', function(done) {
         var flow = [{id:"tn1",type:"toml",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             tn2.on("input", function(msg) {
                 msg.should.have.property('topic', 'bar');
                 msg.payload.should.have.property('employees');
                 msg.payload.employees[0].should.have.property('firstName', 'John');
                 msg.payload.employees[0].should.have.property('lastName', 'Smith');
                 done();
             });
             var tomlString = `[[employees]]
             firstName = "John"
             lastName = "Smith"`;
             tn1.receive({payload:tomlString,topic: "bar"});
         });
     });
 
     it('should convert a valid toml string to a javascript object - using another property', function(done) {
         var flow = [{id:"tn1",type:"toml",property:"foo",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             tn2.on("input", function(msg) {
                 msg.should.have.property('topic', 'bar');
                 msg.foo.should.have.property('employees');
                 msg.foo.employees[0].should.have.property('firstName', 'John');
                 msg.foo.employees[0].should.have.property('lastName', 'Smith');
                 done();
             });
             var tomlString = `[[employees]]
             firstName = "John"
             lastName = "Smith"`;
             tn1.receive({foo:tomlString,topic: "bar"});
         });
     });
 
     it('should convert a javascript object to a toml string', function(done) {
         var flow = [{id:"tn1",type:"toml",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             tn2.on("input", function(msg) {
                 should.equal(msg.payload, '[[employees]]\nfirstName = "John"\nlastName = "Smith"\n');
                 done();
             });
             var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
             tn1.receive({payload:obj});
         });
     });
 
     it('should convert a javascript object to a toml string - using another property', function(done) {
         var flow = [{id:"tn1",type:"toml",property:"foo",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             tn2.on("input", function(msg) {
                 should.equal(msg.foo, '[[employees]]\nfirstName = "John"\nlastName = "Smith"\n');
                 done();
             });
             var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
             tn1.receive({foo:obj});
         });
     });
 
     it('should convert an array to a toml string', function(done) {
         var flow = [{id:"tn1",type:"toml",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             tn2.on("input", function(msg) {
                 should.equal(msg.payload, "integers = [ 1, 2, 3 ]\n");
                 done();
             });
             var obj = {integers: [1,2,3]};
             tn1.receive({payload:obj});
         });
     });
 
     it('should log an error if asked to parse an invalid toml string', function(done) {
         var flow = [{id:"tn1",type:"toml",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             try {
                 var tn1 = helper.getNode("tn1");
                 var tn2 = helper.getNode("tn2");
                 tn1.receive({payload:'key = ',topic: "bar"});
                 setTimeout(function() {
                     try {
                         var logEvents = helper.log().args.filter(function(evt) {
                             return evt[0].type == "toml";
                         });
                         logEvents.should.have.length(1);
                         logEvents[0][0].should.have.a.property('msg');
                         logEvents[0][0].msg.should.startWith("Key without value at row 1, col 8, pos 7:\n1> key = \n          ^\n\n");
                         logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                         done();
                     } catch(err) { done(err) }
                 },50);
             } catch(err) {
                 done(err);
             }
         });
     });
 
     it('should log an error if asked to parse something thats not toml or js', function(done) {
         var flow = [{id:"tn1",type:"toml",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             setTimeout(function() {
                 try {
                     var logEvents = helper.log().args.filter(function(evt) {
                         return evt[0].type == "toml";
                     });
                     logEvents.should.have.length(1);
                     logEvents[0][0].should.have.a.property('msg');
                     logEvents[0][0].msg.toString().should.eql('toml.errors.dropped');
                     done();
                 } catch(err) {
                     done(err);
                 }
             },150);
             tn1.receive({payload:true});
         });
     });
 
     it('should pass straight through if no payload set', function(done) {
         var flow = [{id:"tn1",type:"toml",wires:[["tn2"]],func:"return msg;"},
                     {id:"tn2", type:"helper"}];
         helper.load(tomlNode, flow, function() {
             var tn1 = helper.getNode("tn1");
             var tn2 = helper.getNode("tn2");
             tn2.on("input", function(msg) {
                 msg.should.have.property('topic', 'bar');
                 msg.should.not.have.property('payload');
                 done();
             });
             tn1.receive({topic: "bar"});
         });
     });
 
 });
 