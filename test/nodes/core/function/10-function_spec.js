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
var functionNode = require("nr-test-utils").require("@node-red/nodes/core/function/10-function.js");
var Context = require("nr-test-utils").require("@node-red/runtime/lib/nodes/context");
var helper = require("node-red-node-test-helper");
var RED = require("nr-test-utils").require("node-red/lib/red");
describe('function node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    function initContext(done) {
        Context.init({
            contextStorage: {
                memory1: {
                    module: "memory"
                },
                memory2: {
                    module: "memory"
                }
            }
        });
        Context.load().then(function () {
            done();
        });
    }

    afterEach(function() {
        helper.unload().then(function () {
            return Context.clean({allNodes:{}});
        }).then(function () {
            return Context.close();
        });
    });

    it('should send returned message using send()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.send(msg);"},
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

    it('should do something with the catch node', function(done) {
        var flow = [{"id":"funcNode","type":"function","wires":[["goodNode"]],"func":"node.error('This is an error', msg);"},{"id":"goodNode","type":"helper"},{"id":"badNode","type":"helper"},{"id":"catchNode","type":"catch","scope":null,"uncaught":false,"wires":[["badNode"]]}];
        var catchNodeModule = require("nr-test-utils").require("@node-red/nodes/core/common/25-catch.js")
        helper.load([catchNodeModule, functionNode], flow, function() {
            var funcNode = helper.getNode("funcNode");
            var catchNode = helper.getNode("catchNode");
            var goodNode = helper.getNode("goodNode");
            var badNode = helper.getNode("badNode");

            badNode.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                msg.should.have.property('error');
                msg.error.should.have.property('message',"This is an error");
                msg.error.should.have.property('source');
                msg.error.source.should.have.property('id', "funcNode");
                done();
            });
            funcNode.receive({payload:"foo",topic: "bar"});
        });
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

    it('should send returned message using send()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.send(msg);"},
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

    it('should allow accessing node.id and node.name and node.outputCount', function(done) {
        var flow = [{id:"n1",name:"test-function", outputs: 2, type:"function",wires:[["n2"]],func: "return [{ topic: node.name, payload:node.id, outputCount: node.outputCount }];"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    // Use this form of assert as `msg` is created inside
                    // the sandbox and doesn't get all the should.js monkey patching
                    should.equal(msg.payload, n1.id);
                    should.equal(msg.topic, n1.name);
                    should.equal(msg.outputCount, n1.outputs);
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:""});
        });
    });

    function testSendCloning(args,done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"],["n2"]],func:"node.send("+args+"); msg.payload = 'changed';"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'foo');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            var origMessage = {payload:"foo",topic: "bar"};
            n1.receive(origMessage);
        });
    }
    it('should clone single message sent using send()', function(done) {
        testSendCloning("msg",done);
    });
    it('should not clone single message sent using send(,false)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.send(msg,false); msg.payload = 'changed';"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'changed');
                done();
            });
            var origMessage = {payload:"foo",topic: "bar"};
            n1.receive(origMessage);
        });
    });
    it('should clone first message sent using send() - array 1', function(done) {
        testSendCloning("[msg]",done);
    });
    it('should clone first message sent using send() - array 2', function(done) {
        testSendCloning("[[msg],[null]]",done);
    });
    it('should clone first message sent using send() - array 3', function(done) {
        testSendCloning("[null,msg]",done);
    });
    it('should clone first message sent using send() - array 3', function(done) {
        testSendCloning("[null,[msg]]",done);
    });

    it('should pass through _topic', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                msg.should.have.property('_topic', 'baz');
                done();
            });
            n1.receive({payload:"foo",topic: "bar", _topic: "baz"});
        });
    });

    it('should send to multiple outputs', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"],["n3"]],
        func:"return [{payload: '1'},{payload: '2'}];"},
        {id:"n2", type:"helper"}, {id:"n3", type:"helper"} ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            var count = 0;
            n2.on("input", function(msg) {
                should(msg).have.property('payload', '1');
                count++;
                if (count == 2) {
                    done();
                }
            });
            n3.on("input", function(msg) {
                should(msg).have.property('payload', '2');
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should send to multiple messages', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],
        func:"return [[{payload: 1},{payload: 2}]];"},
        {id:"n2", type:"helper"} ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                count++;
                try {
                    should(msg).have.property('payload', count);
                    should(msg).have.property('_msgid', 1234);
                    if (count == 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"foo", topic: "bar",_msgid:1234});
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
            }, 20);
            n2.on("input", function(msg) {
                should.fail(null,null,"unexpected message");
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle null amongst valid messages', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return [[msg,null,msg],null]"},
        {id:"n2", type:"helper"},
        {id:"n3", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            var n2MsgCount = 0;
            var n3MsgCount = 0;
            n2.on("input", function(msg) {
                n2MsgCount++;
            });
            n3.on("input", function(msg) {
                n3MsgCount++;
            });
            n1.receive({payload:"foo",topic: "bar"});
            setTimeout(function() {
                n2MsgCount.should.equal(2);
                n3MsgCount.should.equal(0);
                done();
            },20);
        });
    });

    it('should get keys in global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.keys();return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', ['count']);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    function testNonObjectMessage(functionText,done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:functionText},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n2MsgCount = 0;
            n2.on("input", function(msg) {
                n2MsgCount++;
            });
            n1.receive({});
            setTimeout(function() {
                try {
                    n2MsgCount.should.equal(0);
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    msg.should.have.property('msg', 'function.error.non-message-returned');
                    done();
                } catch(err) {
                    done(err);
                }
            },20);
        });
    }
    it('should drop and log non-object message types - string', function(done) {
        testNonObjectMessage('return "foo"', done)
    });
    it('should drop and log non-object message types - buffer', function(done) {
        testNonObjectMessage('return Buffer.from("hello")', done)
    });
    it('should drop and log non-object message types - array', function(done) {
        testNonObjectMessage('return [[[1,2,3]]]', done)
    });
    it('should drop and log non-object message types - boolean', function(done) {
        testNonObjectMessage('return true', done)
    });
    it('should drop and log non-object message types - number', function(done) {
        testNonObjectMessage('return 123', done)
    });

    it('should handle and log script error', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"var a = 1;\nretunr"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.receive({payload:"foo",topic: "bar"});
            setTimeout(function() {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    msg.should.have.property('msg', 'ReferenceError: retunr is not defined (line 2, col 1)');
                    done();
                } catch(err) {
                    done(err);
                }
            },50);
        });
    });

    it('should handle node.on()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.on('close',function(){ node.log('closed')});"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.receive({payload:"foo",topic: "bar"});
            setTimeout(function() {
                n1.close().then(function() {
                    try {
                        helper.log().called.should.be.true();
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "function";
                        });
                        logEvents.should.have.length(1);
                        var msg = logEvents[0][0];
                        msg.should.have.property('level', helper.log().INFO);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'closed');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            },100);
        });
    });

    it('should set node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                n1.context().get("count").should.equal("0");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should set persistable node context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0','memory1');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count", "memory1", function (err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set two persistable node context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0','memory1');context.set('count','1','memory2');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count", "memory1", function (err, val1) {
                            val1.should.equal("0");
                            n1.context().get("count", "memory2", function (err, val2) {
                                val2.should.equal("1");
                                done();
                            });
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set two persistable node context (single call, w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set(['count1','count2'],['0','1'],'memory1');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count1", "memory1", function (err, val1) {
                            val1.should.equal("0");
                            n1.context().get("count2", "memory1", function (err, val2) {
                                val2.should.equal("1");
                                done();
                            });
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });


    it('should set persistable node context (w callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0','memory1', function (err) { node.send(msg); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count", "memory1", function (err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set two persistable node context (w callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0','memory1', function (err) { context.set('count', '1', 'memory2', function (err) { node.send(msg); }); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count", "memory1", function (err, val1) {
                            val1.should.equal("0");
                            n1.context().get("count", "memory1", function (err, val2) {
                                val2.should.equal("0");
                                done();
                            });
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set two persistable node context (single call, w callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set(['count1','count2'],['0','1'],'memory1', function(err) { node.send(msg); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count1", "memory1", function (err, val1) {
                            val1.should.equal("0");
                            n1.context().get("count2", "memory1", function (err, val2) {
                                val2.should.equal("1");
                                done();
                            });
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });


    it('should set default persistable node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n1.context().get("count", "memory1", function (err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.get('count');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    function checkCallbackError(name, done) {
        setTimeout(function() {
            try {
                helper.log().called.should.be.true();
                var logEvents = helper.log().args.filter(function (evt) {
                    return evt[0].type == "function";
                });
                logEvents.should.have.length(1);
                var msg = logEvents[0][0];
                msg.should.have.property('level', helper.log().ERROR);
                msg.should.have.property('id', name);
                msg.should.have.property('type', 'function');
                msg.should.have.property('msg', 'Error: Callback must be a function');
                done();
            }
            catch (e) {
                done(e);
            }
        },50);
    }

    it('should get persistable node context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.get('count','memory1');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().set("count","0","memory1");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', '0');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get persistable node context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.get('count','memory1',function (err, val) { msg.payload=val; node.send(msg); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().set("count","0","memory1");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', '0');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get keys in node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.keys();return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', ['count']);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get keys in persistable node context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.keys('memory1');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().set("count","0","memory1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', ['count']);
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get keys in persistable node context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.keys('memory1', function(err, keys) { msg.payload=keys; node.send(msg); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().set("count","0","memory1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', ['count']);
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get keys in default persistable node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.keys();return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().set("count","0","memory1");
                n1.context().set("number","1","memory2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', ['count']);
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                n2.context().flow.get("count").should.equal("0");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should set persistable flow context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0','memory1');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n2.context().flow.get("count", "memory1", function (err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set two persistable flow context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0','memory1');flow.set('count','1','memory2');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n2.context().flow.get("count", "memory1", function (err, val1) {
                            val1.should.equal("0");
                            n2.context().flow.get("count", "memory2", function (err, val2) {
                                val2.should.equal("1");
                                done();
                            });
                        });
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set persistable flow context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0','memory1', function (err) { node.send(msg); });"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n2.context().flow.get("count", "memory1", function (err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set two persistable flow context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0','memory1', function (err) { flow.set('count','1','memory2', function (err) { node.send(msg); }); });"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n2.context().flow.get("count", "memory1", function (err, val1) {
                            val1.should.equal("0");
                            n2.context().flow.get("count", "memory2", function (err, val2) {
                                val2.should.equal("1");
                                done();
                            });
                        });
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.get('count');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get persistable flow context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.get('count','memory1');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().flow.set("count","0","memory1");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', '0');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get persistable flow context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.get('count','memory1', function(err, val) { msg.payload=val; node.send(msg); });"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().flow.set("count","0","memory1");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', '0');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=context.flow.get('count');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get keys in flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.keys();return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', ['count']);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get keys in persistable flow context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.keys('memory1');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().flow.set("count","0","memory1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', ['count']);
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get keys in persistable flow context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.keys('memory1', function (err, val) { msg.payload=val; node.send(msg); });"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().flow.set("count","0","memory1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', ['count']);
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"global.set('count','0');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                n2.context().global.get("count").should.equal("0");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should set persistable global context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"global.set('count','0','memory1');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n2.context().global.get("count", "memory1", function(err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should set persistable global context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"global.set('count','0','memory1', function (err) { node.send(msg); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'foo');
                        n2.context().global.get("count", "memory1", function(err, val) {
                            val.should.equal("0");
                            done();
                        });
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.get('count');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get persistable global context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.get('count', 'memory1');return msg;"},
        {id:"n2", type:"helper"}];
        initContext(function () {
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().global.set("count","0", 'memory1');
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', '0');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get persistable global context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"global.get('count', 'memory1', function (err, val) { msg.payload=val; node.send(msg); });"},
        {id:"n2", type:"helper"}];
        initContext(function () {
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().global.set("count","0", 'memory1');
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', '0');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.global.get('count');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get persistable global context (w/o callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.global.get('count','memory1');return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().global.set("count","0", "memory1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', '0');
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should get persistable global context (w/ callback)', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.global.get('count','memory1', function (err, val) { msg.payload = val; node.send(msg); });"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().global.set("count","0", "memory1");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', '0');
                        done();
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should handle error on get persistable context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=context.get('count','memory1','callback');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().flow.set("count","0","memory1");
                n1.receive({payload:"foo",topic: "bar"});
                checkCallbackError('n1', done);
            });
        });
    });

    it('should handle error on set persistable context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=context.set('count','0','memory1','callback');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.receive({payload:"foo",topic: "bar"});
                checkCallbackError('n1', done);
            });
        });
    });

    it('should handle error on get keys in persistable context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=context.keys('memory1','callback');return msg;"},
        {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n1.context().flow.set("count","0","memory1");
                n1.receive({payload:"foo",topic: "bar"});
                checkCallbackError('n1', done);
            });
        });
    });

    it('should handle setTimeout()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setTimeout(function(){node.send(msg);},700);"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                var endTime = process.hrtime(startTime);
                var nanoTime = endTime[0] * 1000000000 + endTime[1];
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                if (600000000 < nanoTime && nanoTime < 800000000) {
                    done();
                } else {
                    try {
                        should.fail(null, null, "Delayed time was not between 900 and 1100 ms");
                    } catch (err) {
                        done(err);
                    }
                }
            });
            var startTime = process.hrtime();
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle setInterval()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setInterval(function(){node.send(msg);},100);"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                count++;
                if (count > 2) {
                    done();
                }
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle clearInterval()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"var id=setInterval(null,100);setTimeout(function(){clearInterval(id);node.send(msg);},500);"},
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

    it('should allow accessing node.id', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = node.id; return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('payload', n1.id);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should allow accessing node.name', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = node.name; return msg;", "name":"name of node"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('payload', n1.name);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should use the same Date object from outside the sandbox', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.get('typeTest')(new Date());return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("typeTest",function(d) { return d instanceof Date });
            n2.on("input", function(msg) {
                msg.should.have.property('payload', true);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should allow accessing env vars', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = env.get('_TEST_FOO_'); return msg;"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            delete process.env._TEST_FOO_;

            n2.on("input", function(msg) {
                try {
                    if (count === 0) {
                        msg.should.have.property('payload', undefined);
                        process.env._TEST_FOO_ = "hello";
                        count++;
                        n1.receive({payload:"foo",topic: "bar"});
                    } else {
                        msg.should.have.property('payload', "hello");
                        delete process.env._TEST_FOO_;
                        done();
                    }
                } catch(err) {
                    delete process.env._TEST_FOO_;
                    done(err);
                }
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should execute initialization', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = global.get('X'); return msg;",initialize:"global.set('X','bar');"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("payload", "bar");
                done();
            });
            n1.receive({payload: "foo"});
        });
    });

    it('should wait completion of initialization', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = global.get('X'); return msg;",initialize:"global.set('X', '-'); return new Promise((resolve, reject) => setTimeout(() => { global.set('X','bar'); resolve(); }, 500));"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("payload", "bar");
                done();
            });
            n1.receive({payload: "foo"});
        });
    });

    it('should timeout if timeout is set', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],timeout:"0.010",func:"while(1==1){};\nreturn msg;"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.receive({payload:"foo",topic: "bar"});
            setTimeout(function() {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    should.equal(msg.msg.message, 'Script execution timed out after 10ms');
                    done();
                } catch(err) {
                    done(err);
                }
            },50);
        });
    });

    it('check if default function timeout settings are recognized', function (done) {
        RED.settings.functionTimeout = 0.01;
        var flow = [{id: "n1",type: "function",timeout: RED.settings.functionTimeout,wires: [["n2"]],func: "while(1==1){};\nreturn msg;"}];
        helper.load(functionNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.receive({ payload: "foo", topic: "bar" });
            setTimeout(function () {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    should.equal(RED.settings.functionTimeout, 0.01);
                    should.equal(msg.msg.message, 'Script execution timed out after 10ms');
                    delete RED.settings.functionTimeout;
                    done();
                } catch (err) {
                    done(err);
                }
            }, 500);
        });
    });

    describe("finalize function", function() {

        it('should execute', function(done) {
            var flow = [{id:"n1",type:"function",wires:[],func:"return msg;",finalize:"global.set('X','bar');"}];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var ctx = n1.context().global;
                helper.unload().then(function () {
                    ctx.get('X').should.equal("bar");
                    done();
                });
            });
        });

        it('should allow accessing node.id and node.name and node.outputCount', function(done) {
            var flow = [{id:"n1",name:"test-function", outputs: 2, type:"function",wires:[["n2"]],finalize:"global.set('finalize-data', { topic: node.name, payload:node.id, outputCount: node.outputCount});", func: "return msg;"}];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var ctx = n1.context().global;
                helper.unload().then(function () {
                    const finalizeData = ctx.get('finalize-data');
                    should.equal(finalizeData.payload, n1.id);
                    should.equal(finalizeData.topic, n1.name);
                    should.equal(finalizeData.outputCount, n1.outputs);
                    done();
                });
            });
        });

    })

    describe('externalModules', function() {
        afterEach(function() {
            delete RED.settings.functionExternalModules;
        })
        it('should fail if using OS module with functionExternalModules set to false', function(done) {
            var flow = [
                {id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = os.type(); return msg;", "libs": [{var:"os", module:"os"}]},
                {id:"n2", type:"helper"}
            ];
            RED.settings.functionExternalModules = false;
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                should.not.exist(n1);
                done();
            }).catch(err => done(err));
        })

        it('should fail if using OS module without it listed in libs', function(done) {
            var flow = [
                {id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = os.type(); return msg;"},
                {id:"n2", type:"helper"}
            ];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var messageReceived = false;
                n2.on("input", function(msg) {
                    messageReceived = true;
                });
                n1.receive({payload:"foo",topic: "bar"});
                setTimeout(function() {
                    try {
                        messageReceived.should.be.false();
                        done();
                    } catch(err) {
                        done(err);
                    }
                },20);
            }).catch(err => done(err));
        })
        it('should require the OS module', function(done) {
            var flow = [
                {id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = os.type(); return msg;", "libs": [{var:"os", module:"os"}]},
                {id:"n2", type:"helper"}
            ];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', require('os').type());
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            }).catch(err => done(err));
        })
        it('should fail if module variable name clashes with sandbox builtin', function(done) {
            var flow = [
                {id:"n1",type:"function",wires:[["n2"]],func:"msg.payload = os.type(); return msg;", "libs": [{var:"flow", module:"os"}]},
                {id:"n2", type:"helper"}
            ];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                should.not.exist(n1);
                done();
            }).catch(err => done(err));
        })
    })


    describe('Logger', function () {

        function testLog(initCode,funcCode,expectedLevel, done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: funcCode, initialize: initCode}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                setTimeout(function() {
                    try {
                        helper.log().called.should.be.true();
                        var logEvents = helper.log().args.filter(function (evt) {
                            return evt[0].type == "function";
                        });
                        logEvents.should.have.length(1);
                        var msg = logEvents[0][0];
                        msg.should.have.property('level', helper.log()[expectedLevel]);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },10);
            });
        }

        it('should log an Info Message', function (done) {
            testLog("","node.log('test');","INFO",done);
        });
        it('should log a Debug Message', function (done) {
            testLog("","node.debug('test');","DEBUG",done);
        });
        it('should log a Trace Message', function (done) {
            testLog("","node.trace('test');","TRACE",done);
        });
        it('should log a Warning Message', function (done) {
            testLog("","node.warn('test');","WARN",done);
        });
        it('should log an Error Message', function (done) {
            testLog("","node.error('test');","ERROR",done);
        });

        it('should log an Info Message - initialise', function (done) {
            testLog("node.log('test');","","INFO",done);
        });
        it('should log a Debug Message - initialise', function (done) {
            testLog("node.debug('test');","","DEBUG",done);
        });
        it('should log a Trace Message - initialise', function (done) {
            testLog("node.trace('test');","","TRACE",done);
        });
        it('should log a Warning Message - initialise', function (done) {
            testLog("node.warn('test');","","WARN",done);
        });
        it('should log an Error Message - initialise', function (done) {
            testLog("node.error('test');","","ERROR",done);
        });

        it('should catch thrown string', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "throw \"small mistake\";"}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                setTimeout(function() {
                    try {
                        helper.log().called.should.be.true();
                        var logEvents = helper.log().args.filter(function (evt) {
                            return evt[0].type == "function";
                        });
                        logEvents.should.have.length(1);
                        var msg = logEvents[0][0];
                        msg.should.have.property('level', helper.log().ERROR);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'small mistake');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
        it('should catch thrown number', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "throw 99;"}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                setTimeout(function() {
                    try {
                        helper.log().called.should.be.true();
                        var logEvents = helper.log().args.filter(function (evt) {
                            return evt[0].type == "function";
                        });
                        logEvents.should.have.length(1);
                        var msg = logEvents[0][0];
                        msg.should.have.property('level', helper.log().ERROR);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', '99');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
        it('should catch thrown object (bad practice)', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "throw {a:1};"}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                setTimeout(function() {
                    try {
                        helper.log().called.should.be.true();
                        var logEvents = helper.log().args.filter(function (evt) {
                            return evt[0].type == "function";
                        });
                        logEvents.should.have.length(1);
                        var msg = logEvents[0][0];
                        msg.should.have.property('level', helper.log().ERROR);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', '{"a":1}');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
    });

    describe("init function", function() {

        it('should delay handling messages until init completes', function(done) {
            var flow = [{id:"n1",type:"function",wires:[["n2"]],initialize: `
                return new Promise((resolve,reject) => {
                    setTimeout(resolve,200)
                })`,
                func:"return msg;"
            },
            {id:"n2", type:"helper"}];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var receivedMsgs = [];
                n2.on("input", function(msg) {
                    msg.delta = Date.now() - msg.payload;
                    receivedMsgs.push(msg)
                    if (receivedMsgs.length === 5) {
                        var errors = receivedMsgs.filter(msg => msg.delta < 200)
                        if (errors.length > 0) {
                            done(new Error(`Message received before init completed - was ${msg.delta} expected >300`))
                        } else {
                            done();
                        }
                    }
                });
                for (var i=0;i<5;i++) {
                    n1.receive({payload: Date.now(),topic: "msg"+i});
                }
            });
        });

        it('should allow accessing node.id and node.name and node.outputCount and sending message', function(done) {
            var flow = [{id:"n1",name:"test-function", outputs: 1, type:"function",wires:[["n2"]],initialize:"setTimeout(function() { node.send({ topic: node.name, payload:node.id, outputCount: node.outputCount})},10)", func: ""},
            {id:"n2", type:"helper"}];
            helper.load(functionNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        // Use this form of assert as `msg` is created inside
                        // the sandbox and doesn't get all the should.js monkey patching
                        should.equal(msg.payload, n1.id);
                        should.equal(msg.topic, n1.name);
                        should.equal(msg.outputCount, n1.outputs);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });

    });
});
