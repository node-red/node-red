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
var jsonNode = require("../../../../nodes/core/parsers/70-JSON.js");
var helper = require("../../helper.js");

describe('JSON node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"jsonNode1", type:"json", name: "jsonNode" }];
        helper.load(jsonNode, flow, function() {
            var jsonNode1 = helper.getNode("jsonNode1");
            jsonNode1.should.have.property('name', 'jsonNode');
            done();
        });
    });

    it('should convert a valid json string to a javascript object', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]],func:"return msg;"},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.payload.should.have.property('employees');
                msg.payload.employees[0].should.have.property('firstName', 'John');
                msg.payload.employees[0].should.have.property('lastName', 'Smith');
                done();
            });
            var jsonString = '{"employees":[{"firstName":"John", "lastName":"Smith"}]}';
            jn1.receive({payload:jsonString,topic: "bar"});
        });
    });

    it('should convert a javascript object to a json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]],func:"return msg;"},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '{"employees":[{"firstName":"John","lastName":"Smith"}]}');
                done();
            });
            var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
            jn1.receive({payload:obj});
        });
    });

    it('should convert a array to a json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]],func:"return msg;"},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '[1,2,3]');
                done();
            });
            var obj = [1,2,3];
            jn1.receive({payload:obj});
        });
    });

    it('should log an error if asked to parse an invalid json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]],func:"return msg;"},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                jn1.receive({payload:'foo',topic: "bar"});
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "json";
                });
                logEvents.should.have.length(1);
                logEvents[0][0].should.have.a.property('msg');
                logEvents[0][0].msg.should.startWith("Unexpected token o");
                logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if asked to parse something thats not json or js', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]],func:"return msg;"},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            setTimeout(function() {
                try {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "json";
                    });
                    logEvents.should.have.length(3);
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].msg.toString().should.eql('json.errors.dropped');
                    logEvents[1][0].should.have.a.property('msg');
                    logEvents[1][0].msg.toString().should.eql('json.errors.dropped');
                    logEvents[2][0].should.have.a.property('msg');
                    logEvents[2][0].msg.toString().should.eql('json.errors.dropped-object');
                    done();
                } catch(err) {
                    done(err);
                }
            },150);
            jn1.receive({payload:true});
            jn1.receive({payload:1});
            jn1.receive({payload:new Buffer("a")});
        });
    });

    it('should pass straight through if no payload set', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]],func:"return msg;"},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.not.have.property('payload');
                done();
            });
            jn1.receive({topic: "bar"});
        });
    });

});
