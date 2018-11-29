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
var completeNode = require("../../../../nodes/core/core/25-complete.js");
var functionNode = require("../../../../nodes/core/core/80-function.js");
var completeTest00Node = require("../../../resources/nodes/complete-test00.js");
var completeTest01Node = require("../../../resources/nodes/complete-test01.js");
var completeTest02Node = require("../../../resources/nodes/complete-test02.js");
var completeTest03Node = require("../../../resources/nodes/complete-test03.js");
var helper = require("node-red-node-test-helper");

describe('complete node', function() {

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"complete", name: "complete"}];
        helper.load(completeNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'complete');
            done();
        });
    });

    it('should implicitly send msg', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"function", name: "func",
                     func: "return msg;"},
                    {id:"n2", z:"f1", type:"complete", name: "complete",
                     scope: ["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name: "helper"}
                   ];
        var nodes = [completeNode, functionNode];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("complete");
                msg.complete.should.have.property("source");
                msg.complete.source.should.have.property("id", "n1");
                msg.complete.source.should.have.property("name", "func");
                msg.complete.source.should.have.property("type", "function");
                done();
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should implicitly send msg multiple times', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"function", name: "func",
                     func: "return msg;"},
                    {id:"n2", z:"f1", type:"complete", name: "complete",
                     scope: ["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name: "helper"}
                   ];
        var nodes = [completeNode, functionNode];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            var count = 0;
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("complete");
                msg.complete.should.have.property("source");
                msg.complete.source.should.have.property("id", "n1");
                msg.complete.source.should.have.property("name", "func");
                msg.complete.source.should.have.property("type", "function");
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should implicitly send msg from multiple nodes', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"function", name: "func1",
                     func: "return msg;"},
                    {id:"n2", z:"f1", type:"function", name: "func2",
                     func: "return msg;"},
                    {id:"n3", z:"f1", type:"complete", name: "complete",
                     scope: ["n1", "n2"], wires:[["n4"]]},
                    {id:"n4", z:"f1", type:"helper", name: "helper"}
                   ];
        var nodes = [completeNode, functionNode];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n4 = helper.getNode("n4");
            var count = 0;
            n4.on("input", function(msg) {
                msg.should.have.property("_msgid");
                if (msg._msgid === "xyz0") {
                    msg.should.have.property("payload", "foo0");
                    msg.should.have.property("topic", "bar0");
                    msg.should.have.property("complete");
                    msg.complete.should.have.property("source");
                    msg.complete.source.should.have.property("id", "n1");
                    msg.complete.source.should.have.property("name", "func1");
                    msg.complete.source.should.have.property("type", "function");
                    count++;
                }
                if (msg._msgid === "xyz1") {
                    msg.should.have.property("payload", "foo1");
                    msg.should.have.property("topic", "bar1");
                    msg.should.have.property("complete");
                    msg.complete.should.have.property("source");
                    msg.complete.source.should.have.property("id", "n2");
                    msg.complete.source.should.have.property("name", "func2");
                    msg.complete.source.should.have.property("type", "function");
                    count++;
                }
                if (count === 2) {
                    done();
                }
            });
            n1.receive({_msgid:"xyz0", payload:"foo0", topic:"bar0"});
            n2.receive({_msgid:"xyz1", payload:"foo1", topic:"bar1"});
        });
    });

    function test_complete00(node, type, done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:type, name: "CompleteTest",
                     wires: [["n4"]]},
                    {id:"n2", z:"f1", type:"complete", name: "complete",
                     scope: ["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name: "helper"},
                    {id:"n4", z:"f1", type:"helper", name: "helper"}
                   ];
        var nodes = [completeNode, node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            var n4 = helper.getNode("n4");
            var count = 0;
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("complete");
                msg.complete.should.have.property("source");
                msg.complete.source.should.have.property("id", "n1");
                msg.complete.source.should.have.property("name", "CompleteTest");
                msg.complete.source.should.have.property("type", type);
                count++;
                if (count == 2) {
                    done();
                }
            });
            n4.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    }

    it('should implicitly send msg from new style handler using done (default)', function(done) {
        test_complete00(completeTest00Node, "complete-test00", done);
    });

    it('should implicitly send msg from new style handler using done (success)', function(done) {
        test_complete00(completeTest01Node, "complete-test01", done);
    });

    function test_complete01(node, type, done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:type, name: "CompleteTest"},
                    {id:"n2", z:"f1", type:"complete", name: "complete",
                     scope: ["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name: "helper"}
                   ];
        var nodes = [completeNode, node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            var count = 0;
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid");
                if (msg._msgid === "xyz0") {
                    msg.should.have.property("_msgid", "xyz0");
                    msg.should.have.property("payload", "foo0");
                    msg.should.have.property("topic", "bar0");
                }
                else {
                    msg.should.have.property("_msgid", "xyz1");
                    msg.should.have.property("payload", "foo1");
                    msg.should.have.property("topic", "bar1");
                }
                msg.should.have.property("complete");
                msg.complete.should.have.property("source");
                msg.complete.source.should.have.property("id", "n1");
                msg.complete.source.should.have.property("name", "CompleteTest");
                msg.complete.source.should.have.property("type", type);
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({_msgid:"xyz0", payload:"foo0", topic:"bar0"});
            n1.receive({_msgid:"xyz1", payload:"foo1", topic:"bar1"});
        });
    }

    it('should implicitly send msg from new style handler using done (default, async)', function(done) {
        test_complete01(completeTest02Node, "complete-test02", done);
    });

    it('should implicitly send msg from new style handler using done (success, async)', function(done) {
        test_complete01(completeTest03Node, "complete-test03", done);
    });

});
