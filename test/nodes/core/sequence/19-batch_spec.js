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
var batchNode = require("nr-test-utils").require("@node-red/nodes/core/sequence/19-batch.js");
var helper = require("node-red-node-test-helper");
var RED = require("nr-test-utils").require("node-red/lib/red.js");

describe('BATCH node', function() {
    this.timeout(8000);

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
        RED.settings.nodeMessageBufferMaxLength = 0;
    });

    it('should be loaded with defaults', function(done) {
        var flow = [{id:"n1", type:"batch", name: "BatchNode", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(batchNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'BatchNode');
            done();
        });
    });

    function check_parts(msg, id, idx, count) {
        msg.should.have.property("parts");
        var parts = msg.parts;
        parts.should.have.property("id", id);
        parts.should.have.property("index", idx);
        parts.should.have.property("count", count);
    }

    function check_data(n1, n2, results, done) {
        var id = undefined;
        var ix0 = 0; // seq no
        var ix1 = 0; // loc. in seq
        var seq = undefined;
        var msgs = [];
        n2.on("input", function(msg) {
            try {
                for (var i = 0; i < msgs.length; i++) {
                    msg.should.not.equal(msgs[i]);
                }
                msgs.push(msg);
                if (seq === undefined) {
                    seq = results[ix0];
                }
                var val = seq[ix1];
                msg.should.have.property("payload", val);
                if (id === undefined) {
                    id = msg.parts.id;
                }
                check_parts(msg, id, ix1, seq.length);
                ix1++;
                if (ix1 === seq.length) {
                    ix0++;
                    ix1 = 0;
                    seq = undefined;
                    id = undefined;
                    if (ix0 === results.length) {
                        done();
                    }
                }
            }
            catch (e) {
                done(e);
            }
        });
    }

    function check_count(flow, results, done) {
        try {
            helper.load(batchNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                check_data(n1, n2, results, done);
                for(var i = 0; i < 6; i++) {
                    n1.receive({payload: i});
                }
            });
        }
        catch (e) {
            done(e);
        }
    }

    function delayed_send(receiver, index, count, delay) {
        if (index < count) {
            setTimeout(function() {
                receiver.receive({payload: index});
                delayed_send(receiver, index+1, count, delay);
            }, delay);
        }
    }

    function check_interval(flow, results, delay, done) {
        helper.load(batchNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            check_data(n1, n2, results, done);
            delayed_send(n1, 0, 4, delay);
        });
    }

    function check_concat(flow, results, inputs, done) {
        try {
            helper.load(batchNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                check_data(n1, n2, results, done);
                for(var data of inputs) {
                    var msg = {
                        topic: data[0],
                        payload: data[1],
                        parts: {
                            id: data[0],
                            index: data[2],
                            count: data[3]
                        }
                    };
                    n1.receive(msg);
                }
            });
        }
        catch (e) {
            done(e);
        }
    }

    describe('mode: count', function() {

        it('should create seq. with count', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "count", count: 2, overlap: 0, interval: 10, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [0, 1],
                [2, 3],
                [4, 5]
            ];
            check_count(flow, results, done);
        });

        it('should create seq. with count and overlap', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "count", count: 3, overlap: 2, interval: 10, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [0, 1, 2],
                [1, 2, 3],
                [2, 3, 4],
                [3, 4, 5]
            ];
            check_count(flow, results, done);
        });

        it('should handle too many pending messages', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "count", count: 5, overlap: 0, interval: 10, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(batchNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                RED.settings.nodeMessageBufferMaxLength = 2;
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "batch";
                    });
                    var evt = logEvents[0][0];
                    evt.should.have.property('id', "n1");
                    evt.should.have.property('type', "batch");
                    evt.should.have.property('msg', "batch.too-many");
                    done();
                }, 150);
                for(var i = 0; i < 3; i++) {
                    n1.receive({payload: i});
                }
            });
        });

    });

    describe('mode: interval', function() {

        it('should create seq. with interval', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "interval", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [0, 1],
                [2, 3]
            ];
            check_interval(flow, results, 450, done);
        });

        it('should create seq. with interval (in float)', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "interval", count: 0, overlap: 0, interval: 0.5, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [0, 1],
                [2, 3]
            ];
            check_interval(flow, results, 225, done);
        });

        it('should create seq. with interval & not send empty seq', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "interval", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                // 1300, 2600, 3900, 5200,
                [0], [1], [2], [3]
            ];
            check_interval(flow, results, 1300, done);
        });

        it('should create seq. with interval & send empty seq', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "interval", count: 0, overlap: 0, interval: 1, allowEmptySequence: true, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                // 1300, 2600, 3900, 5200,
                [null], [0], [1], [2], [null], [3]
            ];
            check_interval(flow, results, 1300, done);
        });

        it('should handle too many pending messages', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "interval", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(batchNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                RED.settings.nodeMessageBufferMaxLength = 2;
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "batch";
                    });
                    var evt = logEvents[0][0];
                    evt.should.have.property('id', "n1");
                    evt.should.have.property('type', "batch");
                    evt.should.have.property('msg', "batch.too-many");
                    done();
                }, 150);
                for(var i = 0; i < 3; i++) {
                    n1.receive({payload: i});
                }
            });
        });

    });

    describe('mode: concat', function() {

        it('should concat two seq. (series)', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "concat", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [{topic: "TA"}, {topic: "TB"}], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [2, 3, 0, 1]
            ];
            var inputs = [
                ["TB", 0, 0, 2],
                ["TB", 1, 1, 2],
                ["TA", 2, 0, 2],
                ["TA", 3, 1, 2]
            ];
            check_concat(flow, results, inputs, done);
        });

        it('should concat two seq. (mixed)', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "concat", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [{topic: "TA"}, {topic: "TB"}], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [2, 3, 0, 1]
            ];
            var inputs = [
                ["TA", 2, 0, 2],
                ["TB", 0, 0, 2],
                ["TA", 3, 1, 2],
                ["TB", 1, 1, 2]
            ];
            check_concat(flow, results, inputs, done);
        });

        it('should concat three seq.', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "concat", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [{topic: "TA"}, {topic: "TB"}, {topic: "TC"}], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [2, 3, 0, 1, 4]
            ];
            var inputs = [
                ["TC", 4, 0, 1],
                ["TB", 0, 0, 2],
                ["TB", 1, 1, 2],
                ["TA", 2, 0, 2],
                ["TA", 3, 1, 2]
            ];
            check_concat(flow, results, inputs, done);
        });

        it('should concat same seq.', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "concat", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [{topic: "TA"}, {topic: "TA"}], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            var results = [
                [9, 8, 9, 8]
            ];
            var inputs = [
                ["TA", 9, 0, 2],
                ["TA", 8, 1, 2]
            ];
            check_concat(flow, results, inputs, done);
        });

        it('should handle too many pending messages', function(done) {
            var flow = [{id:"n1", type:"batch", name: "BatchNode", mode: "concat", count: 0, overlap: 0, interval: 1, allowEmptySequence: false, topics: [{topic: "TA"}, {topic: "TB"}], wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(batchNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                RED.settings.nodeMessageBufferMaxLength = 2;
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "batch";
                    });
                    var evt = logEvents[0][0];
                    evt.should.have.property('id', "n1");
                    evt.should.have.property('type', "batch");
                    evt.should.have.property('msg', "batch.too-many");
                    done();
                }, 150);
                var C = 3;
                for(var i = 0; i < C; i++) {
                    var parts_a = {index:i, count:C, id:"A"};
                    var parts_b = {index:i, count:C, id:"B"};
                    n1.receive({payload: i, topic: "TA", parts:parts_a});
                    n1.receive({payload: i, topic: "TB", parts:parts_b});
                }
            });
        });

    });

});
