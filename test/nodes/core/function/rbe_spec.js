
var should = require("should");
var helper = require("node-red-node-test-helper");

var testNode = require("nr-test-utils").require("@node-red/nodes/core/function/rbe.js");

describe('rbe node', function() {
    "use strict";

    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload().then(function() {
            helper.stopServer(done);
        });
    });

    it("should be loaded with correct defaults", function(done) {
        var flow = [{"id":"n1", "type":"rbe", "name":"rbe1", "wires":[[]]}];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property("name", "rbe1");
            n1.should.have.property("func", "rbe");
            n1.should.have.property("gap", "0");
            done();
        });
    });

    it('should only send output if payload changes - with multiple topics (rbe)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"rbe", gap:"0", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", "a");
                    c+=1;
                }
                else if (c === 1) {
                    msg.should.have.a.property("payload", 2);
                    c+=1;
                }
                else if (c == 2) {
                    msg.should.have.a.property("payload");
                    msg.payload.should.have.a.property("b",1);
                    msg.payload.should.have.a.property("c",2);
                    c+=1;
                }
                else if (c == 3) {
                    msg.should.have.a.property("payload",true);
                    c+=1;
                }
                else if (c == 4) {
                    msg.should.have.a.property("payload",false);
                    c+=1;
                }
                else if (c == 5) {
                    msg.should.have.a.property("payload",true);
                    c+=1;
                }
                else if (c == 6) {
                    msg.should.have.a.property("topic","a");
                    msg.should.have.a.property("payload",1);
                    c+=1;
                }
                else if (c == 7) {
                    msg.should.have.a.property("topic","b");
                    msg.should.have.a.property("payload",1);
                    c+=1;
                }
                else  {
                    c += 1;
                    msg.should.have.a.property("topic","c");
                    msg.should.have.a.property("payload",1);
                    done();
                }
            });
            n1.emit("input", {payload:"a"});
            n1.emit("input", {payload:"a"});
            n1.emit("input", {payload:"a"});
            n1.emit("input", {payload:2});
            n1.emit("input", {payload:2});
            n1.emit("input", {payload:{b:1,c:2}});
            n1.emit("input", {payload:{c:2,b:1}});
            n1.emit("input", {payload:{c:2,b:1}});
            n1.emit("input", {payload:true});
            n1.emit("input", {payload:false});
            n1.emit("input", {payload:false});
            n1.emit("input", {payload:true});

            n1.emit("input", {topic:"a",payload:1});
            n1.emit("input", {topic:"b",payload:1});
            n1.emit("input", {topic:"b",payload:1});
            n1.emit("input", {topic:"a",payload:1});
            n1.emit("input", {topic:"c",payload:1});

        });
    });

    it('should ignore multiple topics if told to (rbe)', function(done) {
        var flow = [{id:"n1", type:"rbe", func:"rbe", gap:"0", septopics:false, wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", "a");
                    c+=1;
                }
                else if (c === 1) {
                    msg.should.have.a.property("payload", 2);
                    c+=1;
                }
                else if (c == 2) {
                    msg.should.have.a.property("payload");
                    msg.payload.should.have.a.property("b",1);
                    msg.payload.should.have.a.property("c",2);
                    c+=1;
                }
                else if (c == 3) {
                    msg.should.have.a.property("payload",true);
                    c+=1;
                }
                else if (c == 4) {
                    msg.should.have.a.property("payload",false);
                    c+=1;
                }
                else if (c == 5) {
                    msg.should.have.a.property("payload",true);
                    c+=1;
                }
                else if (c == 6) {
                    msg.should.have.a.property("topic","a");
                    msg.should.have.a.property("payload",1);
                    c+=1;
                }
                else  {
                    msg.should.have.a.property("topic","a");
                    msg.should.have.a.property("payload",2);
                    done();
                }
            });
            n1.emit("input", {topic:"a",payload:"a"});
            n1.emit("input", {topic:"b",payload:"a"});
            n1.emit("input", {topic:"c",payload:"a"});
            n1.emit("input", {topic:"a",payload:2});
            n1.emit("input", {topic:"b",payload:2});
            n1.emit("input", {payload:{b:1,c:2}});
            n1.emit("input", {payload:{c:2,b:1}});
            n1.emit("input", {payload:{c:2,b:1}});
            n1.emit("input", {topic:"a",payload:true});
            n1.emit("input", {topic:"b",payload:false});
            n1.emit("input", {topic:"c",payload:false});
            n1.emit("input", {topic:"d",payload:true});

            n1.emit("input", {topic:"a",payload:1});
            n1.emit("input", {topic:"b",payload:1});
            n1.emit("input", {topic:"c",payload:1});
            n1.emit("input", {topic:"d",payload:1});
            n1.emit("input", {topic:"a",payload:2});

        });
    });

    it('should only send output if another chosen property changes - foo (rbe)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"rbe", gap:"0", property:"foo", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("foo", "a");
                    c+=1;
                }
                else if (c === 1) {
                    msg.should.have.a.property("foo", "b");
                    c+=1;
                }
                else {
                    msg.should.have.a.property("foo");
                    msg.foo.should.have.a.property("b",1);
                    msg.foo.should.have.a.property("c",2);
                    done();
                }
            });
            n1.emit("input", {foo:"a"});
            n1.emit("input", {payload:"a"});
            n1.emit("input", {foo:"a"});
            n1.emit("input", {payload:"a"});
            n1.emit("input", {foo:"a"});
            n1.emit("input", {foo:"b"});
            n1.emit("input", {foo:{b:1,c:2}});
            n1.emit("input", {foo:{c:2,b:1}});
            n1.emit("input", {payload:{c:2,b:1}});
        });
    });

    it('should only send output if payload changes - ignoring first value (rbei)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"rbei", gap:"0", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", "b");
                    msg.should.have.a.property("topic", "a");
                    c+=1;
                }
                else if (c === 1) {
                    msg.should.have.a.property("payload", "b");
                    msg.should.have.a.property("topic", "b");
                    c+=1;
                }
                else if (c === 2) {
                    msg.should.have.a.property("payload", "c");
                    msg.should.have.a.property("topic", "a");
                    c+=1;
                }
                else {
                    msg.should.have.a.property("payload", "c");
                    msg.should.have.a.property("topic", "b");
                    done();
                }

            });
            n1.emit("input", {payload:"a", topic:"a"});
            n1.emit("input", {payload:"a", topic:"b"});
            n1.emit("input", {payload:"a", topic:"a"});
            n1.emit("input", {payload:"b", topic:"a"});
            n1.emit("input", {payload:"b", topic:"b"});
            n1.emit("input", {payload:"c", topic:"a"});
            n1.emit("input", {payload:"c", topic:"b"});
        });
    });

    it('should send output if queue is reset (rbe)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"rbe", gap:"0", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", "a");
                    c+=1;
                }
                else if (c === 1) {
                    msg.should.have.a.property("payload", "b");
                    c+=1;
                }
                else if (c === 2) {
                    msg.should.have.a.property("payload", "a");
                    c+=1;
                }
                else if (c === 3) {
                    msg.should.have.a.property("payload", "b");
                    c+=1;
                }
                else if (c === 4) {
                    msg.should.have.a.property("payload", "b");
                    c+=1;
                }
                else if (c === 5) {
                    msg.should.have.a.property("payload", "b");
                    c+=1;
                }
                else if (c === 6) {
                    msg.should.have.a.property("payload", "a");
                    c+=1;
                }
                else {
                    msg.should.have.a.property("payload", "c");
                    done();
                }
            });
            n1.emit("input", {topic:"a", payload:"a"});
            n1.emit("input", {topic:"a", payload:"a"});
            n1.emit("input", {topic:"b", payload:"b"});
            n1.emit("input", {reset:true});             // reset all
            n1.emit("input", {topic:"a", payload:"a"});
            n1.emit("input", {topic:"b", payload:"b"});
            n1.emit("input", {topic:"b", payload:"b"});
            n1.emit("input", {topic:"b", reset:""});    // reset b
            n1.emit("input", {topic:"b", payload:"b"});
            n1.emit("input", {topic:"a", payload:"a"});
            n1.emit("input", {reset:""}); // reset all
            n1.emit("input", {topic:"b", payload:"b"});
            n1.emit("input", {topic:"a", payload:"a"});
            n1.emit("input", {topic:"c"});              // don't reset a non topic
            n1.emit("input", {topic:"b", payload:"b"});
            n1.emit("input", {topic:"a", payload:"a"});
            n1.emit("input", {topic:"c", payload:"c"});
        });
    });

    it('should only send output if x away from original value (deadbandEq)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"deadbandEq", gap:"10", inout:"out", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                c = c + 1;
                if (c === 1) {
                    msg.should.have.a.property("payload", 0);
                }
                else if (c === 2) {
                    msg.should.have.a.property("payload", 10);
                }
                else if (c == 3) {
                    msg.should.have.a.property("payload", 20);
                    done();
                }
            });
            n1.emit("input", {payload:0});
            n1.emit("input", {payload:2});
            n1.emit("input", {payload:4});
            n1.emit("input", {payload:6});
            n1.emit("input", {payload:8});
            n1.emit("input", {payload:10});
            n1.emit("input", {payload:15});
            n1.emit("input", {payload:20});
        });
    });

    it('should only send output if more than x away from original value (deadband)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"deadband", gap:"10", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                c = c + 1;
                //console.log(c,msg);
                if (c === 1) {
                    msg.should.have.a.property("payload", 0);
                }
                else if (c === 2) {
                    msg.should.have.a.property("payload", 20);
                }
                else {
                    msg.should.have.a.property("payload", "5 deg");
                    done();
                }
            });
            n1.emit("input", {payload:0});
            n1.emit("input", {payload:2});
            n1.emit("input", {payload:4});
            n1.emit("input", {payload:"6 deg"});
            n1.emit("input", {payload:8});
            n1.emit("input", {payload:20});
            n1.emit("input", {payload:15});
            n1.emit("input", {payload:"5 deg"});
        });
    });

    it('should only send output if more than x% away from original value (deadband)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"deadband", gap:"10%", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                c = c + 1;
                if (c === 1) {
                    msg.should.have.a.property("payload", 100);
                }
                else if (c === 2) {
                    msg.should.have.a.property("payload", 111);
                }
                else if (c === 3) {
                    msg.should.have.a.property("payload", 135);
                    done();
                }
            });
            n1.emit("input", {payload:100});
            n1.emit("input", {payload:95});
            n1.emit("input", {payload:105});
            n1.emit("input", {payload:111});
            n1.emit("input", {payload:120});
            n1.emit("input", {payload:135});
        });
    });

    it('should warn if no number found in deadband mode', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"deadband", gap:"10", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                c += 1;
            });
            setTimeout( function() {
                c.should.equal(0);
                helper.log().called.should.be.true;
                var logEvents = helper.log().args.filter(function (evt) {
                    return evt[0].type == "rbe";
                });
                logEvents.should.have.length(1);
                var msg = logEvents[0][0];
                msg.should.have.property('level', helper.log().WARN);
                msg.should.have.property('id', 'n1');
                msg.should.have.property('type', 'rbe');
                msg.should.have.property('msg', 'rbe.warn.nonumber');
                done();
            },50);
            n1.emit("input", {payload:"banana"});
        });
    });

    it('should not send output if x away or greater from original value (narrowbandEq)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"narrowbandEq", gap:"10", inout:"out", start:"1", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                c = c + 1;
                //console.log(c,msg);
                if (c === 1) {
                    msg.should.have.a.property("payload", 0);
                }
                else if (c === 2) {
                    msg.should.have.a.property("payload", 5);
                }
                else if (c === 3) {
                    msg.should.have.a.property("payload", 10);
                    done();
                }
            });
            n1.emit("input", {payload:100});
            n1.emit("input", {payload:0});
            n1.emit("input", {payload:10});
            n1.emit("input", {payload:5});
            n1.emit("input", {payload:15});
            n1.emit("input", {payload:10});
            n1.emit("input", {payload:20});
            n1.emit("input", {payload:25});
        });
    });

    it('should not send output if more than x away from original value (narrowband)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"narrowband", gap:"10", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", 0);
                }
                else if (c === 1) {
                    msg.should.have.a.property("payload","6 deg");
                }
                else {
                    msg.should.have.a.property("payload", "5 deg");
                    done();
                }
                c += 1;
            });
            n1.emit("input", {payload:0});
            n1.emit("input", {payload:20});
            n1.emit("input", {payload:40});
            n1.emit("input", {payload:"6 deg"});
            n1.emit("input", {payload:18});
            n1.emit("input", {payload:20});
            n1.emit("input", {payload:50});
            n1.emit("input", {payload:"5 deg"});
        });
    });

    it('should send output if gap is 0 and input doesnt change (narrowband)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"narrowband", gap:"0", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", 1);
                }
                else if (c === 4) {
                    msg.should.have.a.property("payload",1);
                    done();
                }
                c += 1;
            });
            n1.emit("input", {payload:1});
            n1.emit("input", {payload:1});
            n1.emit("input", {payload:1});
            n1.emit("input", {payload:1});
            n1.emit("input", {payload:0});
            n1.emit("input", {payload:1});
        });
    });

    it('should not send output if more than x away from original value (narrowband in step mode)', function(done) {
        var flow = [{"id":"n1", "type":"rbe", func:"narrowband", gap:"10", inout:"in", start:"500", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(testNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 0) {
                    msg.should.have.a.property("payload", 55);
                }
                else if (c === 1) {
                    msg.should.have.a.property("payload", 205);
                    done();
                }
                c += 1;
            });
            n1.emit("input", {payload:50});
            n1.emit("input", {payload:55});
            n1.emit("input", {payload:200});
            n1.emit("input", {payload:205});
        });
    });
});
