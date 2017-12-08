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
var sortNode = require("../../../../nodes/core/logic/18-sort.js");
var helper = require("../../helper.js");
var RED = require("../../../../red/red.js");

describe('SORT node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"payload", name: "SortNode", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'SortNode');
            done();
        });
    });

    function check_sort0(flow, data_in, data_out, done) {
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                msg.should.have.property("payload");
                msg.should.have.property("parts");
                msg.parts.should.have.property("count", data_out.length);
                var index = data_out.indexOf(msg.payload);
                msg.parts.should.have.property("index", index);
                count++;
                if (count === data_out.length) {
                    done();
                }
            });
            var len = data_in.length;
            for(var i = 0; i < len; i++) {
                var parts = { id: "X", index: i, count: len };
                n1.receive({payload:data_in[i], parts: parts});
            }
        });
    }

    function check_sort1(flow, data_in, data_out, done) {
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("payload");
                msg.payload.length.should.equal(data_out.length);
                for(var i = 0; i < data_out.length; i++) {
                    msg.payload[i].should.equal(data_out[i]);
                }
                done();
            });
            n1.receive({payload:data_in});
        });
    }

    (function() {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"payload", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "1000", "200", "30", "4" ];
        it('should sort message group (payload, not number, ascending)', function(done) {
            check_sort0(flow, data_in, data_out, done);
        });
        it('should sort payload (payload, not number, ascending)', function(done) {
            check_sort1(flow, data_in, data_out, done);
        });
    })();
    
    (function() {
        var flow = [{id:"n1", type:"sort", order:"descending", as_num:false, keyType:"payload", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "4", "30", "200", "1000" ];
        it('should sort message group (payload, not number, descending)', function(done) {
            check_sort0(flow, data_in, data_out, done);
        });
        it('should sort payload (payload, not number, descending)', function(done) {
            check_sort1(flow, data_in, data_out, done);
        });
    })();
    
    (function() {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:true, keyType:"payload", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "4", "30", "200", "1000" ];
        it('should sort message group (payload, number, ascending)', function(done) {
            check_sort0(flow, data_in, data_out, done);
        });
        it('should sort payload (payload, number, ascending)', function(done) {
            check_sort1(flow, data_in, data_out, done);
        });
    })();
    
    (function() {
        var flow = [{id:"n1", type:"sort", order:"descending", as_num:true, keyType:"payload", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "1000", "200", "30", "4" ];
        it('should sort message group (payload, number, descending)', function(done) {
            check_sort0(flow, data_in, data_out, done);
        });
        it('should sort payload (payload, number, descending)', function(done) {
            check_sort1(flow, data_in, data_out, done);
        });
    })();

    (function() {
        var data_in  = [ "C200", "A4", "B30", "D1000" ];
        var data_out = [ "D1000", "C200", "B30", "A4" ];
        it('should sort message group (exp, not number, ascending)', function(done) {
            var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"exp", key:"$substring(payload, 1)", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            check_sort0(flow, data_in, data_out, done);
        });
        it('should sort payload (exp, not number, ascending)', function(done) {
            var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"exp", key:"$substring($, 1)", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            check_sort1(flow, data_in, data_out, done);
        });
    })();

    (function() {
        var data_in  = [ "C200", "A4", "B30", "D1000" ];
        var data_out = [ "A4", "B30", "C200", "D1000" ];
        it('should sort message group (exp, not number, descending)', function(done) {
            var flow = [{id:"n1", type:"sort", order:"descending", as_num:false, keyType:"exp", key:"$substring(payload, 1)", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            check_sort0(flow, data_in, data_out, done);
        });
        it('should sort payload (exp, not number, descending)', function(done) {
            var flow = [{id:"n1", type:"sort", order:"descending", as_num:false, keyType:"exp", key:"$substring($, 1)", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            check_sort1(flow, data_in, data_out, done);
        });
    })();

    it('should handle JSONata script error', function(done) {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"exp", key:"$unknown()", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            setTimeout(function() {
                var logEvents = helper.log().args.filter(function (evt) {
                    return evt[0].type == "sort";
                });
                var evt = logEvents[0][0];
                evt.should.have.property('id', "n1");
                evt.should.have.property('type', "sort");
                evt.should.have.property('msg', "sort.invalid-exp");
                done();
            }, 150);
            var msg0 = { payload: "A", parts: { id: "X", index: 0, count: 2} };
            var msg1 = { payload: "B", parts: { id: "X", index: 1, count: 2} };
            n1.receive(msg0);
            n1.receive(msg1);
        });
    });

    it('should handle too many pending messages', function(done) {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"payload", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            RED.settings.sortMaxKeptMsgsCount = 2;
            setTimeout(function() {
                var logEvents = helper.log().args.filter(function (evt) {
                    return evt[0].type == "sort";
                });
                var evt = logEvents[0][0];
                evt.should.have.property('id', "n1");
                evt.should.have.property('type', "sort");
                evt.should.have.property('msg', "sort.too-many");
                done();
            }, 150);
            for(var i = 0; i < 4; i++) {
                var msg = { payload: "V"+i,
                            parts: { id: "X", index: i, count: 4} };
                n1.receive(msg);
            }
        });
    });

    it('should clear pending messages on close', function(done) {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, keyType:"payload", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            setTimeout(function() {
                var logEvents = helper.log().args.filter(function (evt) {
                    return evt[0].type == "sort";
                });
                var evt = logEvents[0][0];
                evt.should.have.property('id', "n1");
                evt.should.have.property('type', "sort");
                evt.should.have.property('msg', "sort.clear");
                done();
            }, 150);
            var msg = { payload: 0,
                        parts: { id: "X", index: 0, count: 2} };
            n1.receive(msg);
            n1.close();
        });
    });

});
