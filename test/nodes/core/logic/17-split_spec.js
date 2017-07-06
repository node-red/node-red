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
var splitNode = require("../../../../nodes/core/logic/17-split.js");
var joinNode = require("../../../../nodes/core/logic/17-split.js");
var helper = require("../../helper.js");

describe('SPLIT node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"splitNode1", type:"split", name:"splitNode" }];
        helper.load(splitNode, flow, function() {
            var splitNode1 = helper.getNode("splitNode1");
            splitNode1.should.have.property('name', 'splitNode');
            done();
        });
    });

    it('should split an array into multiple messages', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]]},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                msg.should.have.property("parts");
                msg.parts.should.have.property("count",4);
                msg.parts.should.have.property("type","array");
                msg.parts.should.have.property("index");
                if (msg.parts.index === 0) { msg.payload.should.equal(1); }
                if (msg.parts.index === 1) { msg.payload.should.equal(2); }
                if (msg.parts.index === 2) { msg.payload.should.equal(3); }
                if (msg.parts.index === 3) { msg.payload.should.equal(4); done(); }
            });
            sn1.receive({payload:[1,2,3,4]});
        });
    });

    it('should split an array into multiple messages of a specified size', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]], arraySplt:3, arraySpltType:"len"},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                msg.should.have.property("parts");
                msg.parts.should.have.property("count",2);
                msg.parts.should.have.property("type","array");
                msg.parts.should.have.property("index");
                msg.payload.should.be.an.Array();
                if (msg.parts.index === 0) { msg.payload.length.should.equal(3); }
                if (msg.parts.index === 1) { msg.payload.length.should.equal(1); done(); }
            });
            sn1.receive({payload:[1,2,3,4]});
        });
    });

    it('should split an object into pieces', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]]},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            var count = 0;
            sn2.on("input", function(msg) {
                msg.should.have.property("payload");
                msg.should.have.property("parts");
                msg.parts.should.have.property("type","object");
                msg.parts.should.have.property("key");
                msg.parts.should.have.property("count");
                msg.parts.should.have.property("index");
                msg.topic.should.equal("foo");
                if (msg.parts.index === 0) { msg.payload.should.equal(1); }
                if (msg.parts.index === 1) { msg.payload.should.equal("2"); }
                if (msg.parts.index === 2) { msg.payload.should.equal(true); done(); }
            });
            sn1.receive({topic:"foo",payload:{a:1,b:"2",c:true}});
        });
    });

    it('should split an object into pieces and overwrite their topics', function(done) {
        var flow = [{id:"sn1", type:"split", addname:"topic", wires:[["sn2"]]},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            var count = 0;
            sn2.on("input", function(msg) {
                msg.should.have.property("payload");
                msg.should.have.property("parts");
                msg.parts.should.have.property("type","object");
                msg.parts.should.have.property("key");
                msg.parts.should.have.property("count");
                msg.parts.should.have.property("index");
                if (msg.parts.index === 0) { msg.payload.should.equal(1); msg.topic.should.equal("a"); }
                if (msg.parts.index === 1) { msg.payload.should.equal("2"); msg.topic.should.equal("b"); }
                if (msg.parts.index === 2) { msg.payload.should.equal(true); msg.topic.should.equal("c"); done(); }
            });
            sn1.receive({topic:"foo",payload:{a:1,b:"2",c:true}});
        });
    });

    it('should split a string into new-lines', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]]},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                msg.should.have.property("parts");
                msg.parts.should.have.property("count",4);
                msg.parts.should.have.property("type","string");
                msg.parts.should.have.property("index");
                if (msg.parts.index === 0) { msg.payload.should.equal("Da"); }
                if (msg.parts.index === 1) { msg.payload.should.equal("ve"); }
                if (msg.parts.index === 2) { msg.payload.should.equal(" "); }
                if (msg.parts.index === 3) { msg.payload.should.equal("CJ"); done(); }
            });
            sn1.receive({payload:"Da\nve\n \nCJ"});
        });
    });

    it('should split a string on a specified char', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]], splt:"\n"},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                msg.should.have.property("parts");
                msg.parts.should.have.property("count",3);
                msg.parts.should.have.property("ch","\n");
                msg.parts.should.have.property("index");
                msg.parts.should.have.property("type","string");
                if (msg.parts.index === 0) { msg.payload.should.equal("1"); }
                if (msg.parts.index === 1) { msg.payload.should.equal("2"); }
                if (msg.parts.index === 2) { msg.payload.should.equal("3"); done(); }
            });
            sn1.receive({payload:"1\n2\n3"});
        });
    });

    it('should split a string into lengths', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]], splt:"2", spltType:"len"},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                msg.should.have.property("parts");
                msg.parts.should.have.property("count",4);
                msg.parts.should.have.property("ch","");
                msg.parts.should.have.property("index");
                msg.parts.should.have.property("type","string");
                if (msg.parts.index === 0) { msg.payload.should.equal("12"); }
                if (msg.parts.index === 1) { msg.payload.should.equal("34"); }
                if (msg.parts.index === 2) { msg.payload.should.equal("56"); }
                if (msg.parts.index === 3) { msg.payload.should.equal("78"); done(); }
            });
            sn1.receive({payload:"12345678"});
        });
    });

    it('should split a string on a specified char in stream mode', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]], splt:"\n", stream:true},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                msg.should.have.property("parts");
                msg.parts.should.have.property("ch","\n");
                msg.parts.should.have.property("index");
                msg.parts.should.have.property("type","string");
                if (msg.parts.index === 0) { msg.payload.should.equal("1"); }
                if (msg.parts.index === 1) { msg.payload.should.equal("2"); }
                if (msg.parts.index === 2) { msg.payload.should.equal("3"); }
                if (msg.parts.index === 3) { msg.payload.should.equal("4"); }
                if (msg.parts.index === 4) { msg.payload.should.equal("5"); }
                if (msg.parts.index === 5) { msg.payload.should.equal("6"); done(); }
            });
            sn1.receive({payload:"1\n2\n3\n"});
            sn1.receive({payload:"4\n5\n6\n"});
        });
    });

    it('should split a buffer into lengths', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]], splt:"2", spltType:"len"},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                try {
                    //console.log(msg);
                    msg.should.have.property("parts");
                    Buffer.isBuffer(msg.payload).should.be.true();
                    msg.parts.should.have.property("count",4);
                    msg.parts.should.have.property("index");
                    msg.parts.should.have.property("type","buffer");
                    if (msg.parts.index === 0) { msg.payload.toString().should.equal("12"); }
                    if (msg.parts.index === 1) { msg.payload.toString().should.equal("34"); }
                    if (msg.parts.index === 2) { msg.payload.toString().should.equal("56"); }
                    if (msg.parts.index === 3) { msg.payload.toString().should.equal("78"); done(); }
                } catch(err) {
                    done(err);
                }
            });
            var b = new Buffer.from("12345678");
            sn1.receive({payload:b});
        });
    });

    it('should split a buffer on another buffer (streaming)', function(done) {
        var flow = [{id:"sn1", type:"split", wires:[["sn2"]], splt:"[52]", spltType:"bin", stream:true},
                    {id:"sn2", type:"helper"}];
        helper.load(splitNode, flow, function() {
            var sn1 = helper.getNode("sn1");
            var sn2 = helper.getNode("sn2");
            sn2.on("input", function(msg) {
                try {
                    msg.should.have.property("parts");
                    Buffer.isBuffer(msg.payload).should.be.true();
                    msg.parts.should.have.property("index");
                    msg.parts.should.have.property("type","buffer");
                    if (msg.parts.index === 0) { msg.payload.toString().should.equal("123"); }
                    if (msg.parts.index === 1) { msg.payload.toString().should.equal("123"); }
                    if (msg.parts.index === 2) { msg.payload.toString().should.equal("123"); done(); }
                } catch(err) {
                    done(err);
                }
            });
            var b1 = new Buffer.from("123412");
            var b2 = new Buffer.from("341234");
            sn1.receive({payload:b1});
            sn1.receive({payload:b2});
        });
    });

});

describe('JOIN node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"joinNode1", type:"join", name:"joinNode" }];
        helper.load(joinNode, flow, function() {
            var joinNode1 = helper.getNode("joinNode1");
            joinNode1.should.have.property('name', 'joinNode');
            joinNode1.should.have.property('count', 0);
            joinNode1.should.have.property('timer', 0);
            joinNode1.should.have.property('build', 'array');
            done();
        });
    });

    it('should join bits of string back together automatically', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], joiner:",", build:"string", mode:"auto"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.equal("A,B,C,D");
                    done();
                }
                catch(e) {done(e);}
            });
            n1.receive({payload:"A", parts:{id:1, type:"string", ch:",", index:0, count:4}});
            n1.receive({payload:"B", parts:{id:1, type:"string", ch:",", index:1, count:4}});
            n1.receive({payload:"C", parts:{id:1, type:"string", ch:",", index:2, count:4}});
            n1.receive({payload:"D", parts:{id:1, type:"string", ch:",", index:3, count:4}});
        });
    });
    it('should join bits of string back together automatically with a buffer joiner', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], joiner:"[44]", joinerType:"bin", build:"string", mode:"auto"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.equal("A,B,C,D");
                    done();
                }
                catch(e) {done(e);}
            });
            n1.receive({payload:"A", parts:{id:1, type:"string", ch:",", index:0, count:4}});
            n1.receive({payload:"B", parts:{id:1, type:"string", ch:",", index:1, count:4}});
            n1.receive({payload:"C", parts:{id:1, type:"string", ch:",", index:2, count:4}});
            n1.receive({payload:"D", parts:{id:1, type:"string", ch:",", index:3, count:4}});
        });
    });
    it('should join bits of buffer back together automatically', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], joiner:",", build:"buffer", mode:"auto"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    Buffer.isBuffer(msg.payload).should.be.true();
                    msg.payload.toString().should.equal("A-B-C-D");
                    done();
                }
                catch(e) {done(e);}
            });
            n1.receive({payload:Buffer.from("A"), parts:{id:1, type:"buffer", ch:Buffer.from("-"), index:0, count:4}});
            n1.receive({payload:Buffer.from("B"), parts:{id:1, type:"buffer", ch:Buffer.from("-"), index:1, count:4}});
            n1.receive({payload:Buffer.from("C"), parts:{id:1, type:"buffer", ch:Buffer.from("-"), index:2, count:4}});
            n1.receive({payload:Buffer.from("D"), parts:{id:1, type:"buffer", ch:Buffer.from("-"), index:3, count:4}});
        });
    });

    it('should join things into an array after a count', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], count:3, joiner:",",mode:"custom"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.be.an.Array();
                    msg.payload[0].should.equal(1);
                    msg.payload[1].should.equal(true);
                    //msg.payload[2].a.should.equal(1);
                    done();
                }
                catch(e) {done(e);}
            });
            n1.receive({payload:1});
            n1.receive({payload:true});
            n1.receive({payload:{a:1}});
        });
    });

    it('should join things into an object after a count', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], count:5, build:"object", mode:"custom"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.have.property("a",1);
                    msg.payload.should.have.property("b","2");
                    msg.payload.should.have.property("c",true);
                    msg.payload.should.have.property("d");
                    msg.payload.d.should.have.property("e",7);
                    msg.payload.should.have.property("g");
                    msg.payload.g.should.have.property("f",6);
                    done();
                }
                catch(e) { done(e)}
            });
            n1.receive({payload:1, topic:"a"});
            n1.receive({payload:"2", topic:"b"});
            n1.receive({payload:true, topic:"c"});
            n1.receive({payload:{e:5}, topic:"d"});
            n1.receive({payload:{e:7}, topic:"d"});
            n1.receive({payload:{f:6}, topic:"g"});
        });
    });

    it('should merge objects', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], count:5, build:"merged", mode:"custom"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.have.property("a",1);
                    msg.payload.should.have.property("b",2);
                    msg.payload.should.have.property("c",3);
                    msg.payload.should.have.property("d",4);
                    msg.payload.should.have.property("e",5);
                    done();
                }
                catch(e) { done(e)}
            });
            n1.receive({payload:{a:9}, topic:"f"});
            n1.receive({payload:{a:1}, topic:"a"});
            n1.receive({payload:{b:9}, topic:"b"});
            n1.receive({payload:{b:2}, topic:"b"});
            n1.receive({payload:{c:3}, topic:"c"});
            n1.receive({payload:{d:4}, topic:"d"});
            n1.receive({payload:{e:5}, topic:"e"});
        });
    });

    it('should accumulate a merged object', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], build:"merged",mode:"custom",accumulate:true, count:1},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 5) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("a",3);
                        msg.payload.should.have.property("b",2);
                        msg.payload.should.have.property("c",1);
                        done();
                    }
                    catch(e) { done(e) }
                }
                c += 1;
            });
            n1.receive({payload:{a:1}, topic:"a"});
            n1.receive({payload:{b:2}, topic:"b"});
            n1.receive({payload:{c:3}, topic:"c"});
            n1.receive({payload:{a:3}, topic:"d"});
            n1.receive({payload:{b:2}, topic:"e"});
            n1.receive({payload:{c:1}, topic:"f"});
        });
    });

    it('should be able to reset an accumulation', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], build:"merged",accumulate:true,mode:"custom", count:1},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                if (c === 3) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("a",1);
                        msg.payload.should.have.property("b",2);
                        msg.payload.should.have.property("c",3);
                        msg.payload.should.have.property("d",4);
                    }
                    catch(e) { done(e) }
                }
                if (c === 5) {
                    try {
                        msg.should.have.property("payload");
                        msg.payload.should.have.property("b",2);
                        msg.payload.should.have.property("c",1);
                        done();
                    }
                    catch(e) { done(e) }
                }
                c += 1;
            });
            n1.receive({payload:{a:1}, topic:"a"});
            n1.receive({payload:{b:2}, topic:"b"});
            n1.receive({payload:{c:3}, topic:"c"});
            n1.receive({payload:{d:4}, topic:"d", complete:true});
            n1.receive({payload:{b:2}, topic:"e"});
            n1.receive({payload:{c:1}, topic:"f"});
        });
    });

    it('should accumulate a key/value object', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], build:"object", accumulate:true, mode:"custom", topic:"bar", key:"foo", count:4},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var c = 0;
            n2.on("input", function(msg) {
                try {
                    //msg.should.have.property("topic","bar");
                    msg.should.have.property("payload");
                    msg.payload.should.have.property("a",1);
                    msg.payload.should.have.property("b",2);
                    msg.payload.should.have.property("c",3);
                    msg.payload.should.have.property("d",4);
                    done();
                }
                catch(e) { done(e) }
            });
            n1.receive({payload:1, foo:"a"});
            n1.receive({payload:2, foo:"b"});
            n1.receive({payload:3, foo:"c"});
            n1.receive({payload:4, foo:"d"});
        });
    });

    it('should join strings with a specifed character after a timeout', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], build:"string", timeout:0.05, count:"", joiner:",",mode:"custom"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.equal("a,b,c");
                    done();
                }
                catch(e) { done(e) }
            });
            n1.receive({payload:"a"});
            n1.receive({payload:"b"});
            n1.receive({payload:"c"});
        });
    });

    it('should join strings with a specifed character and complete when told to', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], build:"string", timeout:5, count:0, joiner:"\n",mode:"custom"},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.equal("Hello\nNodeRED\nWorld\n");
                    done();
                }
                catch(e) { done(e) }
            });
            n1.receive({payload:"Hello"});
            n1.receive({payload:"NodeRED"});
            n1.receive({payload:"World"});
            n1.receive({payload:'', complete:true});
        });
    });

    it('should join split things back into an array', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.be.an.Array();
                    msg.payload[0].should.equal(1);
                    msg.payload[1].should.equal(2);
                    msg.payload[2].should.equal(3);
                    msg.payload[3].should.equal(4);
                    done();
                }
                catch(e) { done(e); }
            });
            n1.receive({payload:3, parts:{index:2, count:4, id:111}});
            n1.receive({payload:2, parts:{index:1, count:4, id:111}});
            n1.receive({payload:4, parts:{index:3, count:4, id:111}});
            n1.receive({payload:1, parts:{index:0, count:4, id:111}});
        });
    });

    it('should join split things back into an object', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.have.property("a",1);
                    msg.payload.should.have.property("b",2);
                    msg.payload.should.have.property("c",3);
                    msg.payload.should.have.property("d",4);
                    done();
                }
                catch(e) { done(e); }
            });
            n1.receive({payload:3, parts:{index:2, count:4, id:222, key:"c", type:"object"}});
            n1.receive({payload:2, parts:{index:1, count:4, id:222, key:"b", type:"object"}});
            n1.receive({payload:4, parts:{index:3, count:4, id:222, key:"d", type:"object"}});
            n1.receive({payload:1, parts:{index:0, count:4, id:222, key:"a", type:"object"}});
        });
    });

    it('should join split things, send when told complete', function(done) {
        var flow = [{id:"n1", type:"join", wires:[["n2"]], timeout:0.250},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.be.an.Array();
                    (msg.payload[0] === undefined).should.be.true();
                    msg.payload[1].should.equal(2);
                    msg.payload[2].should.equal(3);
                    msg.payload[3].should.equal(4);
                    done();
                }
                catch(e) { done(e); }
            });
            n1.receive({payload:3, parts:{index:2, count:4, id:444} });
            n1.receive({payload:2, parts:{index:1, count:4, id:444} });
            n1.receive({payload:4, parts:{index:3, count:4, id:444}, complete:true});
        });
    });

    it('should join split strings back into a word', function(done) {
        var flow = [{id:"n1", type:"join", mode:"auto", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.be.an.String();
                    msg.payload.should.equal("abcd");
                    done();
                }
                catch(e) { done(e); }
            });
            n1.receive({payload:"a", parts:{type:'string',index:0, count:4, ch:"", id:555}});
            n1.receive({payload:"d", parts:{type:'string',index:3, count:4, ch:"", id:555}});
            n1.receive({payload:"c", parts:{type:'string',index:2, count:4, ch:"", id:555}});
            n1.receive({payload:"b", parts:{type:'string',index:1, count:4, ch:"", id:555}});
        });
    });

    it('should allow chained split-split-join-join sequences', function(done) {
        var flow = [{id:"s1", type:"split",wires:[["s2"]]},
                    {id:"s2", type:"split",wires:[["j1"]]},
                    {id:"j1", type:"join", mode:"auto", wires:[["j2"]]},
                    {id:"j2", type:"join", mode:"auto", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        helper.load(joinNode, flow, function() {
            var s1 = helper.getNode("s1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload");
                    msg.payload.should.eql([[1,2,3],"a\nb\nc",[7,8,9]]);
                    done();
                }
                catch(e) { done(e); }
            });
            s1.receive({payload:[[1,2,3],"a\nb\nc",[7,8,9]]});
        });
    })

});
