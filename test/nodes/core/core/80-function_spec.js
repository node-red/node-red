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
var functionNode = require("../../../../nodes/core/core/80-function.js");
var helper = require("../../helper.js");

describe('function node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"function", name: "function" }];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'function');
            done();
        });
    });

    it('should send returned message', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should allow input to be discarded by returning null', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return null"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            setTimeout(function() {
                done();
            }, 200);
            n2.on("input", function(msg) {
                should.fail(null,null,"unexpected message");
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

});
