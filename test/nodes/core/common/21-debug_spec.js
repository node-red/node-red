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
var debugNode = require("nr-test-utils").require("@node-red/nodes/core/common/21-debug.js");
var helper = require("node-red-node-test-helper");
var WebSocket = require('ws');

describe('debug node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    beforeEach(function (done) {
        setTimeout(function() {
            done();
        }, 55);
    });

    afterEach(function() {
        helper.unload();
    });


    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"debug", name:"Debug", complete:"false" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'Debug');
            n1.should.have.property('complete', "payload");
            done();
        });
    });

    it('should publish on input', function(done) {
        var flow = [{id:"n1", type:"debug", name:"Debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",name:"Debug",msg:"test",path:"global",
                    format:"string[4]",property:"payload"}
                }]);
            }, done);
        });
    });

    it('should publish to console', function(done) {
        var flow = [{id:"n1", type:"debug", console:"true"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            var count = 0;
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"test",property:"payload",format:"string[4]",path:"global"}
                }]);
                count++;
            }, function() {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "debug";
                    });
                    logEvents.should.have.length(1);
                    var tstmp = logEvents[0][0].timestamp;
                    logEvents[0][0].should.eql({level:helper.log().INFO, id:'n1',type:'debug',msg:'test', timestamp:tstmp,path:"global"});

                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should publish complete message', function(done) {
        var flow = [{id:"n1", type:"debug", complete:"true" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",
                    data:{id:"n1",msg:'{\n "payload": "test"\n}',format:"Object",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish complete message to console', function(done) {
        var flow = [{id:"n1", type:"debug", complete:"true", console:"true" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",
                    data:{id:"n1",msg:'{\n "payload": "test"\n}',format:"Object",path:"global"}
                }]);
            }, function() {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "debug";
                    });
                    logEvents.should.have.length(1);
                    var tstmp = logEvents[0][0].timestamp;
                    logEvents[0][0].should.eql({level:helper.log().INFO, id:"n1",type:"debug",msg:'\n{ payload: \'test\' }',timestamp:tstmp,path:"global"});
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should publish other property', function(done) {
        var flow = [{id:"n1", type:"debug", complete:"foo" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test", foo:"bar"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"bar",property:"foo",format:"string[3]",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish multi-level properties', function(done) {
        var flow = [{id:"n1", type:"debug", complete:"foo.bar" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test", foo: {bar:"bar"}});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"bar",property:"foo.bar",format:"string[3]",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish an Error', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: new Error("oops")});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:'{"name":"Error","message":"oops"}',property:"payload",format:"error",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish a boolean', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: true});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg: 'true',property:"payload",format:"boolean",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish a number', function(done) {
        var flow = [{id:"n1", type:"debug", console:"true" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: 7});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"7",property:"payload",format:"number",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish a NaN', function(done) {
        var flow = [{id:"n1", type:"debug", console:"true" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: Number.NaN});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"NaN",property:"payload",format:"number",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish with no payload', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:'(undefined)',property:"payload",format:"undefined",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish a null', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:null});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:'(undefined)',property:"payload",format:"null",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish an object', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: {type:'foo'}});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",
                    data:{id:"n1",msg:'{\n "type": "foo"\n}',property:"payload",format:"Object",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish an array', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: [0,1,2,3]});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",
                    data:{id:"n1",msg: '[\n 0,\n 1,\n 2,\n 3\n]',format:"array[4]",
                    property:"payload",path:"global"}
                }]);
            }, done);
        });
    });

    it('should publish an object with circular references', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                var o = { name: 'bar' };
                o.o = o;
                n1.emit("input", {payload: o});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:'{\n "name": "bar",\n "o": "[Circular ~]"\n}',
                        property:"payload",format:"Object",path:"global"
                    }
                }]);
            }, done);
        });
    });

    it('should publish an object to console', function(done) {
        var flow = [{id:"n1", type:"debug", console:"true"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: {type:'foo'}});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:'{\n "type": "foo"\n}',property:"payload",format:"Object",path:"global"}
                }]);
            }, function() {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "debug";
                    });
                    logEvents.should.have.length(1);
                    var tstmp = logEvents[0][0].timestamp;
                    logEvents[0][0].should.eql({level:helper.log().INFO,id:"n1",type:"debug",msg:'\n{ type: \'foo\' }',timestamp:tstmp,path:"global"});
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should publish a string after a newline to console if the string contains \\n', function(done) {
        var flow = [{id:"n1", type:"debug", console:"true"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test\ntest"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"test\ntest",property:"payload",format:"string[9]",path:"global"}
                }]);
            }, function() {
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "debug";
                    });
                    logEvents.should.have.length(1);
                    var tstmp = logEvents[0][0].timestamp;
                    logEvents[0][0].should.eql({level:helper.log().INFO,id:"n1",type:"debug",msg:"\ntest\ntest",timestamp:tstmp,path:"global"});
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should publish complete message with edit', function(done) {
        var flow = [{id:"n1", type:"debug", name:"Debug", complete: "true",
                     targetType: "jsonata", complete: '"<" & payload & ">"'}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",name:"Debug",msg:"<test>",
                    format:"string[6]",path:"global"}
                }]);
            }, done);
        });
    });

    it('should truncate a long message', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:Array(1002).join("X")});
            }, function(msg) {
                var a = JSON.parse(msg);
                a.should.eql([{
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg: Array(1001).join("X")+'...',
                        property:"payload",
                        format:"string[1001]",
                        path:"global"
                    }
                }]);
            }, done);
        });
    });

    it('should truncate a long string in the object', function(done) {
        var flow = [{id:"n1", type:"debug"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: {foo: Array(1002).join("X")}});
            }, function(msg) {
                var a = JSON.parse(msg);
                a.should.eql([{
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:'{\n "foo": "'+Array(1001).join("X")+'..."\n}',
                        property:"payload",
                        format:"Object",
                        path:"global"
                    }
                }]);
            }, done);
        });
    });

    it('should truncate a large array', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: Array(1001).fill("X")});
            }, function(msg) {
                var a = JSON.parse(msg);
                a.should.eql([{
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:JSON.stringify({
                            __enc__: true,
                            type: "array",
                            data: Array(1000).fill("X"),
                            length: 1001
                        },null," "),
                        property:"payload",
                        format:"array[1001]",
                        path:"global"
                    }
                }]);
            }, done);
        });
    });

    it('should truncate a large array in the object', function(done) {
        var flow = [{id:"n1", type:"debug"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: {foo: Array(1001).fill("X")}});
            }, function(msg) {
                var a = JSON.parse(msg);
                a.should.eql([{
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:JSON.stringify({
                            foo:{
                                __enc__: true,
                                type: "array",
                                data: Array(1000).fill("X"),
                                length: 1001
                            }
                        },null," "),
                        property:"payload",
                        format:"Object",
                        path:"global"
                    }
                }]);
            }, done);
        });
    });

    it('should truncate a large buffer', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: Buffer.alloc(501,"\"")});
            }, function(msg) {
                var a = JSON.parse(msg);
                a[0].should.eql({
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg: Array(1001).join("2"),
                        property:"payload",
                        format:"buffer[501]",
                        path:"global"
                    }
                });
            }, done);
        });
    });

    it('should truncate a large buffer in the object', function(done) {
        var flow = [{id:"n1", type:"debug"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: {foo: Buffer.alloc(1001,"X")}});
            }, function(msg) {
                var a = JSON.parse(msg);
                a[0].should.eql({
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:JSON.stringify({
                            foo:{
                                type: "Buffer",
                                data: Array(1000).fill(88),
                                __enc__: true,
                                length: 1001
                            }
                        },null," "),
                        property:"payload",
                        format:"Object",
                        path:"global"
                    }
                });
            }, done);
        });
    });

    it('should convert Buffer to hex', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: Buffer.from('HELLO', 'utf8')});
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:'48454c4c4f',
                        property:"payload",
                        format:"buffer[5]",
                        path:"global"
                    }
                }]);
            }, done);
        });
    });

    it('should publish when active', function(done) {
        var flow = [{id:"n1", type:"debug", active: false }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"message 1"});
                helper.request()
                    .post('/debug/n1/enable')
                    .expect(200).end(function(err) {
                        if (err) { return done(err); }
                        n1.emit("input", {payload:"message 2"});
                    });
            }, function(msg) {
                JSON.parse(msg).should.eql([{
                    topic:"debug",data:{id:"n1",msg:"message 2",property:"payload",format:"string[9]",path:"global"}
                }]);
            }, done);
        });
    });

    it('should not publish when inactive', function(done) {
        var flow = [{id:"n1", type:"debug", active: true }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function(close) {
                helper.request()
                    .post('/debug/n1/disable')
                    .expect(201).end(function(err) {
                        if (err) {
                            close();
                            return done(err);
                        }
                        n1.emit("input", {payload:"message"});
                        setTimeout(function() {
                            close();
                            done();
                        }, 200);
                    });
            }, function(msg) {
                should.fail(null,null,"unexpected message");
            }, function() {});
        });
    });

    describe('post', function() {
        it('should return 404 on invalid state', function(done) {
            var flow = [{id:"n1", type:"debug", active: true }];
            helper.load(debugNode, flow, function() {
                helper.request()
                    .post('/debug/n1/foobar')
                    .expect(404).end(done);
            });
        });

        it('should return 404 on invalid node', function(done) {
            helper.request()
                .post('/debug/n99/enable')
                .expect(404).end(done);
        });
    });

    describe('get', function() {
        it('should return the view.html', function(done) {
            var flow = [{id:"n1", type:"debug"}];
            helper.load(debugNode, flow, function() {
                helper.request()
                    .get('/debug/view/view.html')
                    .expect(200)
                    .end(done);
            });
        });
    });

});

function websocket_test(open_callback, message_callback, done_callback) {
    var ws = new WebSocket(helper.url() + "/comms");
    var close_callback = function() { ws.close(); };
    ws.on('open', function() { open_callback(close_callback); });
    ws.on('message', function(msg) {
        try {
            message_callback(msg, close_callback);
            ws.close();
            done_callback();
        } catch(err) {
            done_callback(err);
        }
    });
}
