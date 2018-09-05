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
var catchNode = require("../../../../nodes/core/core/25-catch.js");
var functionNode = require("../../../../nodes/core/core/80-function.js");
var catchTest00Node = require("../../../resources/nodes/catch-test00.js");
var catchTest01Node = require("../../../resources/nodes/catch-test01.js");
var catchTest02Node = require("../../../resources/nodes/catch-test02.js");
var catchTest03Node = require("../../../resources/nodes/catch-test03.js");
var catchTest04Node = require("../../../resources/nodes/catch-test04.js");
var RED = require("../../../../red/red.js");
var runtime = require("../../../../red/runtime");
var helper = require("node-red-node-test-helper");

describe('catch Node', function() {

    afterEach(function() {
        helper.unload();
        runtime.setNodeTimeout(undefined);
    });

    it('should output a message when called', function(done) {
        var flow = [ { id:"n1", type:"catch", name:"catch", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(catchNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.should.have.property('name', 'catch');
            n2.on("input", function(msg) {
                msg.should.be.a.Error();
                msg.toString().should.equal("Error: big error");
                done();
            });
            var err = new Error("big error");
            n1.emit("input", err);
        });
    });

    it('should catch error', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"catch-test00", name:"CatchTest",
                     func:"node.error('error', msg);"},
                    {id:"n2", z:"f1", type:"catch", name:"catch",
                     scope:["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name:"helper"}
                   ];
        var nodes = [catchNode, catchTest00Node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("error");
                msg.error.should.have.property("source");
                msg.error.source.should.have.property("id", "n1");
                msg.error.source.should.have.property("name", "CatchTest");
                msg.error.source.should.have.property("type", "catch-test00");
                done();
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should catch error from function node', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"function", name:"func",
                     func:"node.error('error', msg);"},
                    {id:"n2", z:"f1", type:"catch", name:"catch",
                     scope:["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name:"helper"}
                   ];
        var nodes = [catchNode, functionNode];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("error");
                msg.error.should.have.property("source");
                msg.error.source.should.have.property("id", "n1");
                msg.error.source.should.have.property("name", "func");
                msg.error.source.should.have.property("type", "function");
                done();
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should catch error from new style handler using done (no msg)', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"catch-test01", name:"CatchTest"},
                    {id:"n2", z:"f1", type:"catch", name:"catch",
                     scope:["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name:"helper"}
                   ];
        var nodes = [catchNode, catchTest01Node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("error");
                msg.error.should.have.property("source");
                msg.error.source.should.have.property("id", "n1");
                msg.error.source.should.have.property("name", "CatchTest");
                msg.error.source.should.have.property("type", "catch-test01");
                done();
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should catch error from new style handler using done (msg)', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"catch-test02", name:"CatchTest"},
                    {id:"n2", z:"f1", type:"catch", name:"catch",
                     scope:["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name:"helper"}
                   ];
        var nodes = [catchNode, catchTest02Node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "e:xyz");
                msg.should.have.property("payload", "e:foo");
                msg.should.have.property("topic", "e:bar");
                msg.should.have.property("error");
                msg.error.should.have.property("source");
                msg.error.source.should.have.property("id", "n1");
                msg.error.source.should.have.property("name", "CatchTest");
                msg.error.source.should.have.property("type", "catch-test02");
                done();
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should catch node timeout (local, new hendler)', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"catch-test03", name:"CatchTest"},
                    {id:"n2", z:"f1", type:"catch", name:"catch",
                     scope:["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name:"helper"}
                   ];
        var nodes = [catchNode, catchTest03Node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            var count = 0;
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("error");
                msg.error.should.have.property("source");
                msg.error.source.should.have.property("id", "n1");
                msg.error.source.should.have.property("name", "CatchTest");
                msg.error.source.should.have.property("type", "catch-test03");
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

    it('should catch node timeout (global, new handler)', function(done) {
        var flow = [{id:"f1", type:"tab", label:"test flow"},
                    {id:"n1", z:"f1", type:"catch-test04", name:"CatchTest"},
                    {id:"n2", z:"f1", type:"catch", name:"catch",
                     scope:["n1"], wires:[["n3"]]},
                    {id:"n3", z:"f1", type:"helper", name:"helper"}
                   ];
        var nodes = [catchNode, catchTest04Node];
        helper.load(nodes, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            var count = 0;
            runtime.setNodeTimeout(500);
            n3.on("input", function(msg) {
                msg.should.have.property("_msgid", "xyz");
                msg.should.have.property("payload", "foo");
                msg.should.have.property("topic", "bar");
                msg.should.have.property("error");
                msg.error.should.have.property("source");
                msg.error.source.should.have.property("id", "n1");
                msg.error.source.should.have.property("name", "CatchTest");
                msg.error.source.should.have.property("type", "catch-test04");
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
            n1.receive({_msgid:"xyz", payload:"foo", topic:"bar"});
        });
    });

});
