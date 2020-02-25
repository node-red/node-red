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
var linkNode = require("nr-test-utils").require("@node-red/nodes/core/common/60-link.js");
var helper = require("node-red-node-test-helper");

describe('link Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded (link in)', function(done) {
        var flow = [{id:"n1", type:"link in", name: "link-in" }];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'link-in');
            done();
        });
    });

    it('should be loaded (link out)', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out" }];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'link-out');
            done();
        });
    });

    it('should be linked', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out", links:["n2"]},
                    {id:"n2", type:"link in", name: "link-in", wires:[["n3"]]},
                    {id:"n3", type:"helper"}];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                try {
                    msg.should.have.property('payload', 'hello');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"hello"});
        });
    });

    it('should be linked to multiple nodes', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out", links:["n2", "n3"]},
                    {id:"n2", type:"link in", name: "link-in0", wires:[["n4"]]},
                    {id:"n3", type:"link in", name: "link-in1", wires:[["n4"]]},
                    {id:"n4", type:"helper"} ];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n4 = helper.getNode("n4");
            var count = 0;
            n4.on("input", function (msg) {
                try {
                    msg.should.have.property('payload', 'hello');
                    count++;
                    if(count == 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"hello"});
        });
    });

    it('should be linked from multiple nodes', function(done) {
        var flow = [{id:"n1", type:"link out", name: "link-out0", links:["n3"]},
                    {id:"n2", type:"link out", name: "link-out1", links:["n3"]},
                    {id:"n3", type:"link in", name: "link-in", wires:[["n4"]]},
                    {id:"n4", type:"helper"} ];
        helper.load(linkNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n4 = helper.getNode("n4");
            var count = 0;
            n4.on("input", function(msg) {
                try {
                    msg.should.have.property('payload', 'hello');
                    count++;
                    if(count == 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"hello"});
            n2.receive({payload:"hello"});
        });
    });

});
