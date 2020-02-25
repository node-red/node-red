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
var sortNode = require("nr-test-utils").require("@node-red/nodes/core/sequence/18-sort.js");
var helper = require("node-red-node-test-helper");
var RED = require("nr-test-utils").require("node-red/lib/red.js");
var Context = require("nr-test-utils").require("@node-red/runtime/lib/nodes/context");

describe('SORT node', function() {

    beforeEach(function(done) {
        helper.startServer(done);
    });

    function initContext(done) {
        Context.init({
            contextStorage: {
                memory: {
                    module: "memory"
                }
            }
        });
        Context.load().then(function () {
            done();
        });
    }

    afterEach(function(done) {
        helper.unload().then(function(){
            RED.settings.nodeMessageBufferMaxLength = 0;
            helper.stopServer(done);
        });
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, name: "SortNode", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'SortNode');
            done();
        });
    });

    function check_sort0(flow, target, key, key_type, data_in, data_out, done) {
        var sort = flow[0];
        sort.target = target;
        sort.targetType = "msg";
        sort.msgKey = key;
        sort.msgKeyType = key_type;
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property(target);
                    var data = msg[target];
                    data.length.should.equal(data_out.length);
                    for(var i = 0; i < data_out.length; i++) {
                        var data0 = data[i];
                        var data1 = data_out[i];
                        if (typeof data0 === "object") {
                            data0.should.deepEqual(data1);
                        }
                        else {
                            data0.should.equal(data1);
                        }
                    }
                    done();
                }
                catch(e) {
                    console.log(e);
                }
            });
            var msg = {};
            msg[target] = data_in;
            n1.receive(msg);
        });
    }

    function check_sort0A(flow, data_in, data_out, done) {
        check_sort0(flow, "payload", "", "elem", data_in, data_out, done);
    }

    function check_sort0B(flow, data_in, data_out, done) {
        check_sort0(flow, "data", "", "elem", data_in, data_out, done);
    }

    function check_sort0C(flow, exp, data_in, data_out, done) {
        check_sort0(flow, "data", exp, "jsonata", data_in, data_out, done);
    }

    function check_sort1(flow, key, key_type, data_in, data_out, done) {
        function equals(v0, v1) {
            var k0 = Object.keys(v0);
            var k1 = Object.keys(v1);

            if (k0.length === k1.length) {
                for (var i = 0; i < k0.length; i++) {
                    var k = k0[i];
                    if (!v1.hasOwnProperty(k) ||
                        (v0[k] !== v1[k])) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        function indexOf(a, v) {
            for(var i = 0; i < a.length; i++) {
                var av = a[i];
                if ((typeof v === 'object') && equals(v, av)) {
                    return i;
                }
                else if (v === av) {
                    return i;
                }
            }
            return -1;
        }
        var sort = flow[0];
        var prop = (key_type === "msg") ? key : "payload";
        sort.targetType = "seq";
        sort.seqKey = key;
        sort.seqKeyType = key_type;
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                msg.should.have.property(prop);
                msg.should.have.property("parts");
                msg.parts.should.have.property("count", data_out.length);
                var data = msg[prop];
                var index = indexOf(data_out, data);
                msg.parts.should.have.property("index", index);
                count++;
                if (count === data_out.length) {
                    done();
                }
            });
            var len = data_in.length;
            for(var i = 0; i < len; i++) {
                var parts = { id: "X", index: i, count: len };
                var msg = {parts: parts};
                msg[prop] = data_in[i];
                n1.receive(msg);
            }
        });
    }

    function check_sort1A(flow, data_in, data_out, done) {
        check_sort1(flow, "payload", "msg", data_in, data_out, done);
    }

    function check_sort1B(flow, data_in, data_out, done) {
        check_sort1(flow, "data", "msg", data_in, data_out, done);
    }

    function check_sort1C(flow, exp, data_in, data_out, done) {
        check_sort1(flow, exp, "jsonata", data_in, data_out, done);
    }

    (function() {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "1000", "200", "30", "4" ];
        it('should sort payload (elem, not number, ascending)', function(done) {
            check_sort0A(flow, data_in, data_out, done);
        });
        it('should sort msg prop (elem, not number, ascending)', function(done) {
            check_sort0B(flow, data_in, data_out, done);
        });
        it('should sort message group/payload (not number, ascending)', function(done) {
            check_sort1A(flow, data_in, data_out, done);
        });
        it('should sort message group/prop (not number, ascending)', function(done) {
            check_sort1B(flow, data_in, data_out, done);
        });
    })();

    (function() {
        var flow = [{id:"n1", type:"sort", order:"descending", as_num:false, wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "4", "30", "200", "1000" ];
        it('should sort payload (elem, not number, descending)', function(done) {
            check_sort0A(flow, data_in, data_out, done);
        });
        it('should sort msg prop (elem, not number, descending)', function(done) {
            check_sort0B(flow, data_in, data_out, done);
        });
        it('should sort message group/payload (not number, descending)', function(done) {
            check_sort1A(flow, data_in, data_out, done);
        });
        it('should sort message group/prop (not number, descending)', function(done) {
            check_sort1B(flow, data_in, data_out, done);
        });
    })();

    (function() {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:true, wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "4", "30", "200", "1000" ];
        it('should sort payload (elem, number, ascending)', function(done) {
            check_sort0A(flow, data_in, data_out, done);
        });
        it('should sort msg prop (elem, number, ascending)', function(done) {
            check_sort0B(flow, data_in, data_out, done);
        });
        it('should sort message group/payload (number, ascending)', function(done) {
            check_sort1A(flow, data_in, data_out, done);
        });
        it('should sort message group/prop (number, ascending)', function(done) {
            check_sort1B(flow, data_in, data_out, done);
        });
    })();

    (function() {
        var flow = [{id:"n1", type:"sort", order:"descending", as_num:true, wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "200", "4", "30", "1000" ];
        var data_out = [ "1000", "200", "30", "4" ];
        it('should sort payload (elem, number, descending)', function(done) {
            check_sort0A(flow, data_in, data_out, done);
        });
        it('should sort msg prop (elem, number, descending)', function(done) {
            check_sort0B(flow, data_in, data_out, done);
        });
        it('should sort message group/payload (number, descending)', function(done) {
            check_sort1A(flow, data_in, data_out, done);
        });
        it('should sort message group/prop (number, descending)', function(done) {
            check_sort1B(flow, data_in, data_out, done);
        });
    })();

    (function() {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var data_in  = [ "C200", "A4", "B30", "D1000" ];
        var data_out = [ "D1000", "C200", "B30", "A4" ];
        it('should sort payload (exp, not number, ascending)', function(done) {
            check_sort0C(flow, "$substring($,1)", data_in, data_out, done);
        });
        it('should sort message group (exp, not number, ascending)', function(done) {
            check_sort1C(flow, "$substring(payload,1)", data_in, data_out, done);
        });
    })();

    (function() {
        var flow = [{id:"n1", type:"sort", order:"descending", as_num:false, wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
        var data_in  = [ "C200", "A4", "B30", "D1000" ];
        var data_out = [ "A4", "B30", "C200", "D1000" ];
        it('should sort message group (exp, not number, descending)', function(done) {
            check_sort0C(flow, "$substring($,1)", data_in, data_out, done);
        });
        it('should sort payload (exp, not number, descending)', function(done) {
            check_sort1C(flow, "$substring(payload,1)", data_in, data_out, done);
        });
    })();

    (function() {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:true, wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var conv = function(x) {
            return x.map(function(v) { return { val:v }; });
        };
        var data_in  = conv([ "200", "4", "30", "1000" ]);
        var data_out = conv([ "4", "30", "200", "1000" ]);
        it('should sort payload of objects', function(done) {
            check_sort0C(flow, "val", data_in, data_out, done);
        });
    })();

    it('should sort payload by context (exp, not number, ascending)', function(done) {
        var flow = [{id:"n1", type:"sort", target:"data", targetType:"msg", msgKey:"$flowContext($)", msgKeyType:"jsonata", order:"ascending", as_num:false, wires:[["n2"]],z:"flow"},
                    {id:"n2", type:"helper",z:"flow"},
                    {id:"flow", type:"tab"}];
        var data_in  = [ "first", "second", "third", "fourth" ];
        var data_out = [ "second", "third", "first", "fourth" ];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context()["flow"].set("first","3");
            n1.context()["flow"].set("second","1");
            n1.context()["flow"].set("third","2");
            n1.context()["flow"].set("fourth","4");
            n2.on("input", function(msg) {
                msg.should.have.property("data");
                var data = msg["data"];
                data.length.should.equal(data_out.length);
                for(var i = 0; i < data_out.length; i++) {
                    data[i].should.equal(data_out[i]);
                }
                done();
            });
            var msg = {};
            msg["data"] = data_in;
            n1.receive(msg);
        });
    });

    it('should sort message group by context (exp, not number, ascending)', function(done) {
        var flow = [{id:"n1", type:"sort", target:"data", targetType:"seq", seqKey:"$globalContext(payload)", seqKeyType:"jsonata", order:"ascending", as_num:false, wires:[["n2"]],z:"flow"},
                    {id:"n2", type:"helper",z:"flow"},
                    {id:"flow", type:"tab"}];
        var data_in  = [ "first", "second", "third", "fourth" ];
        var data_out = [ "second", "fourth", "third", "first" ];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n1.context()["global"].set("first","4");
            n1.context()["global"].set("second","1");
            n1.context()["global"].set("third","3");
            n1.context()["global"].set("fourth","2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.should.have.property("parts");
                    msg.parts.should.have.property("count", data_out.length);
                    var data = msg["payload"];
                    var index = data_out.indexOf(data);
                    msg.parts.should.have.property("index", index);
                    count++;
                    if (count === data_out.length) {
                        done();
                    }
                }
                catch(e) {
                    done(e);
                }
            });
            var len = data_in.length;
            for(var i = 0; i < len; i++) {
                var parts = { id: "X", index: i, count: len };
                var msg = {parts: parts};
                msg["payload"] = data_in[i];
                n1.receive(msg);
            }
        });
    });

    it('should sort payload by persistable context (exp, not number, descending)', function(done) {
        var flow = [{id:"n1", type:"sort", target:"data", targetType:"msg", msgKey:"$globalContext($,\"memory\")", msgKeyType:"jsonata", order:"descending", as_num:false, wires:[["n2"]],z:"flow"},
                    {id:"n2", type:"helper",z:"flow"},
                    {id:"flow", type:"tab"}];
        var data_in  = [ "first", "second", "third", "fourth" ];
        var data_out = [ "fourth", "first", "third", "second" ];
        helper.load(sortNode, flow, function() {
            initContext(function(){
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context()["global"].set(["first","second","third","fourth"],["3","1","2","4"],"memory",function(){
                    n2.on("input", function(msg) {
                        msg.should.have.property("data");
                        var data = msg["data"];
                        data.length.should.equal(data_out.length);
                        for(var i = 0; i < data_out.length; i++) {
                            data[i].should.equal(data_out[i]);
                        }
                        done();
                    });
                    var msg = {};
                    msg["data"] = data_in;
                    n1.receive(msg);
                });
            });
        });
    });

    it('should sort message group by persistable context (exp, not number, descending)', function(done) {
        var flow = [{id:"n1", type:"sort", target:"data", targetType:"seq", seqKey:"$flowContext(payload,\"memory\")", seqKeyType:"jsonata", order:"descending", as_num:false, wires:[["n2"]],z:"flow"},
                    {id:"n2", type:"helper",z:"flow"},
                    {id:"flow", type:"tab"}];
        var data_in  = [ "first", "second", "third", "fourth" ];
        var data_out = [ "first", "third", "fourth", "second" ];
        helper.load(sortNode, flow, function() {
            initContext(function(){
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var count = 0;
                n1.context()["flow"].set(["first","second","third","fourth"],["4","1","3","2"],"memory",function(){
                    n2.on("input", function(msg) {
                        msg.should.have.property("payload");
                        msg.should.have.property("parts");
                        msg.parts.should.have.property("count", data_out.length);
                        var data = msg["payload"];
                        var index = data_out.indexOf(data);
                        msg.parts.should.have.property("index", index);
                        count++;
                        if (count === data_out.length) {
                            done();
                        }
                    });
                    var len = data_in.length;
                    for(var i = 0; i < len; i++) {
                        var parts = { id: "X", index: i, count: len };
                        var msg = {parts: parts};
                        msg["payload"] = data_in[i];
                        n1.receive(msg);
                    }
                });
            });
        });
    });

    it('should handle JSONata script error', function(done) {
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, target:"payload", targetType:"seq", seqKey:"$unknown()", seqKeyType:"jsonata", wires:[["n2"]]},
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
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, target:"payload", targetType:"seq", seqKey:"payload", seqKeyType:"msg", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            RED.settings.nodeMessageBufferMaxLength = 2;
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
        var flow = [{id:"n1", type:"sort", order:"ascending", as_num:false, target:"payload", targetType:"seq", seqKey:"payload", seqKeyType:"msg", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(sortNode, flow, function() {
            var n1 = helper.getNode("n1");
            var msg = { payload: 0,
                        parts: { id: "X", index: 0, count: 2} };
            n1.receive(msg);
            setTimeout(function() {
                n1.close().then(function() {
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "sort";
                    });
                    var evt = logEvents[0][0];
                    evt.should.have.property('id', "n1");
                    evt.should.have.property('type', "sort");
                    evt.should.have.property('msg', "sort.clear");
                    done();
                });
            }, 150);
        });
    });

});
