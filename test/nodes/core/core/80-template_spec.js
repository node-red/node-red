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
        var flow = [{id:"n1", type:"template", field:"payload", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
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

    it('should modify payload from flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{flow.value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("value","foo");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify payload from global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{global.value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("value","foo");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle missing node context', function(done) {
        // this is artificial test because in flow there is missing z property (probably never happen in real usage)
        var flow = [{id:"n1",type:"template", field:"payload", template:"payload={{flow.value}},{{global.value}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=,');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });


    it('should modify payload in plain text mode', function(done) {
        var flow = [{id:"n1", type:"template", field:"payload", syntax:"plain", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload={{payload}}');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", fieldType:"flow", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                // mesage is intact
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                // result is in flow context
                n2.context().flow.get("payload").should.equal("payload=foo");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", fieldType:"global", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                // mesage is intact
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                // result is in global context
                n2.context().global.get("payload").should.equal("payload=foo");
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
            n1.receive({payload:{doh:{rei:{me:"foo"}}}});
        });
    });

    it('should handle block contexts objects', function(done) {
        var flow = [{id:"n1", type:"template", template: "A{{#payload.A}}{{payload.A}}{{.}}{{/payload.A}}B",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('payload','AabcabcB');
                done();
            });
            n1.receive({payload:{A:"abc"}});
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
