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
var templateNode = require("../../../../nodes/core/core/80-template.js");
var helper = require("../../helper.js");

describe('template node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });


    it('should modify payload', function(done) {
        var flow = [{id:"n1", type:"template", field: "payload", template: "payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle if the field isn\'t set', function(done) {
        var flow = [{id:"n1", type:"template", template: "payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle deeper objects', function(done) {
        var flow = [{id:"n1", type:"template", field: "topic.foo.bar", template: "payload={{payload.doh.rei.me}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic');
                msg.topic.should.have.property('foo');
                msg.topic.foo.should.have.a.property('bar', 'payload=foo');
                done();
            });
            n1.receive({payload:{doh:{rei:{me:"foo"}}}, topic:"bar"});
        });
    });

    it('should raise error if passed bad template', function(done) {
        var flow = [{id:"n1", type:"template", field: "payload", template: "payload={{payload",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            setTimeout(function() {
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "template";
                });
                logEvents.should.have.length(1);
                logEvents[0][0].should.have.a.property('msg');
                logEvents[0][0].msg.toString().should.startWith("Unclosed tag at ");
                done();
            },25);
            n1.receive({payload:"foo"});
        });
    });

});
