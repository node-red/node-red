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
            },1500);
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
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setTimeout(function(){node.send(msg);},1000);"},
        {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                var endTime = process.hrtime(startTime);
                var nanoTime = endTime[0] * 1000000000 + endTime[1];
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                if (900000000 < nanoTime && nanoTime < 1100000000) {
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
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"var id=setInterval(null,100);setTimeout(function(){clearInterval(id);node.send(msg);},1000);"},
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

    describe('Logger', function () {
        it('should log an Info Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.log('test');"}];
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
                        msg.should.have.property('level', helper.log().INFO);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
        it('should log a Debug Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.debug('test');"}];
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
                        msg.should.have.property('level', helper.log().DEBUG);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
        it('should log a Trace Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.trace('test');"}];
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
                        msg.should.have.property('level', helper.log().TRACE);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
        it('should log a Warning Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.warn('test');"}];
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
                        msg.should.have.property('level', helper.log().WARN);
                        msg.should.have.property('id', 'n1');
                        msg.should.have.property('type', 'function');
                        msg.should.have.property('msg', 'test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
        });
        it('should log an Error Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.error('test');"}];
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
                        msg.should.have.property('msg', 'test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                },50);
            });
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

});
