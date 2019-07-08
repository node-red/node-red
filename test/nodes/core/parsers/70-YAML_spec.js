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
var yamlNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-YAML.js");
var helper = require("node-red-node-test-helper");

describe('YAML node', function() {

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
        var flow = [{id:"yamlNode1", type:"yaml", name: "yamlNode" }];
        helper.load(yamlNode, flow, function() {
            var yamlNode1 = helper.getNode("yamlNode1");
            yamlNode1.should.have.property('name', 'yamlNode');
            done();
        });
    });

    it('should convert a valid yaml string to a javascript object', function(done) {
        var flow = [{id:"yn1",type:"yaml",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            yn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.payload.should.have.property('employees');
                msg.payload.employees[0].should.have.property('firstName', 'John');
                msg.payload.employees[0].should.have.property('lastName', 'Smith');
                done();
            });
            var yamlString = "employees:\n  - firstName: John\n    lastName: Smith\n";
            yn1.receive({payload:yamlString,topic: "bar"});
        });
    });

    it('should convert a valid yaml string to a javascript object - using another property', function(done) {
        var flow = [{id:"yn1",type:"yaml",property:"foo",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            yn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.foo.should.have.property('employees');
                msg.foo.employees[0].should.have.property('firstName', 'John');
                msg.foo.employees[0].should.have.property('lastName', 'Smith');
                done();
            });
            var yamlString = "employees:\n  - firstName: John\n    lastName: Smith\n";
            yn1.receive({foo:yamlString,topic: "bar"});
        });
    });

    it('should convert a javascript object to a yaml string', function(done) {
        var flow = [{id:"yn1",type:"yaml",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            yn2.on("input", function(msg) {
                should.equal(msg.payload, "employees:\n  - firstName: John\n    lastName: Smith\n");
                done();
            });
            var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
            yn1.receive({payload:obj});
        });
    });

    it('should convert a javascript object to a yaml string - using another property', function(done) {
        var flow = [{id:"yn1",type:"yaml",property:"foo",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            yn2.on("input", function(msg) {
                should.equal(msg.foo, "employees:\n  - firstName: John\n    lastName: Smith\n");
                done();
            });
            var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
            yn1.receive({foo:obj});
        });
    });

    it('should convert an array to a yaml string', function(done) {
        var flow = [{id:"yn1",type:"yaml",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            yn2.on("input", function(msg) {
                should.equal(msg.payload, "- 1\n- 2\n- 3\n");
                done();
            });
            var obj = [1,2,3];
            yn1.receive({payload:obj});
        });
    });

    it('should log an error if asked to parse an invalid yaml string', function(done) {
        var flow = [{id:"yn1",type:"yaml",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            try {
                var yn1 = helper.getNode("yn1");
                var yn2 = helper.getNode("yn2");
                yn1.receive({payload:'employees:\n-firstName: John\n- lastName: Smith\n',topic: "bar"});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "yaml";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.startWith("end of the stream");
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },50);
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if asked to parse something thats not yaml or js', function(done) {
        var flow = [{id:"yn1",type:"yaml",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            setTimeout(function() {
                try {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "yaml";
                    });
                    logEvents.should.have.length(3);
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].msg.toString().should.eql('yaml.errors.dropped');
                    logEvents[1][0].should.have.a.property('msg');
                    logEvents[1][0].msg.toString().should.eql('yaml.errors.dropped');
                    logEvents[2][0].should.have.a.property('msg');
                    logEvents[2][0].msg.toString().should.eql('yaml.errors.dropped-object');
                    done();
                } catch(err) {
                    done(err);
                }
            },150);
            yn1.receive({payload:true});
            yn1.receive({payload:1});
            yn1.receive({payload:Buffer.from("a")});
        });
    });

    it('should pass straight through if no payload set', function(done) {
        var flow = [{id:"yn1",type:"yaml",wires:[["yn2"]],func:"return msg;"},
                    {id:"yn2", type:"helper"}];
        helper.load(yamlNode, flow, function() {
            var yn1 = helper.getNode("yn1");
            var yn2 = helper.getNode("yn2");
            yn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.not.have.property('payload');
                done();
            });
            yn1.receive({topic: "bar"});
        });
    });

});
