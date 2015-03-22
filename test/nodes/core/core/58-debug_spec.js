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
var debugNode = require("../../../../nodes/core/core/58-debug.js");
var helper = require("../../helper.js");
var WebSocket = require('ws');

describe('debug node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });


    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"debug", name: "Debug", complete:"false" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'Debug');
            n1.should.have.property('complete', "payload");
            done();
        });
    });

    it('should publish on input', function(done) {
        var flow = [{id:"n1", type:"debug", name: "Debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",name:"Debug",msg:"test",
                    format:"string",property:"payload"}
                });
            }, done);
        });
    });

    it('should publish to console', function(done) {
        var flow = [{id:"n1", type:"debug", console: "true"}];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            var count = 0;
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg:"test",property:"payload",format:"string"}
                });
                count++;
            }, function() {
                try {
                    helper.log().called.should.be.true;
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "debug";
                    });
                    logEvents.should.have.length(1);
                    var tstmp = logEvents[0][0].timestamp;
                    logEvents[0][0].should.eql({level:helper.log().INFO, id:'n1',type:'debug',msg:'test', timestamp:tstmp});

                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should publish complete message', function(done) {
        var flow = [{id:"n1", type:"debug", complete: "true" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test"});
            }, function(msg) {
                JSON.parse(msg).should.eql({
                    topic:"debug",
                    data:{id:"n1",msg:'{\n "payload": "test"\n}',format:"object"}
                });
            }, done);
        });
    });

    it('should publish other property', function(done) {
        var flow = [{id:"n1", type:"debug", complete: "foo" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test", foo:"bar"});
            }, function(msg) {
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg:"bar",property:"foo",format:"string"}
                });
            }, done);
        });
    });

    it('should publish multi-level properties', function(done) {
        var flow = [{id:"n1", type:"debug", complete: "foo.bar" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload:"test", foo: {bar: "bar"}});
            }, function(msg) {
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg:"bar",property:"foo.bar",format:"string"}
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg:"Error: oops",property:"payload",format:"error"}
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg: 'true',property:"payload",format:"boolean"}
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg: '(undefined)',property:"payload",format:"undefined"}
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",
                    data:{id:"n1",msg:'{\n "type": "foo"\n}',property:"payload",format:"object"}
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",
                    data:{id:"n1",msg: '[\n 0,\n 1,\n 2,\n 3\n]',format:"array",
                    property:"payload"}
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg:'{\n "name": "bar",\n "o": "[circular]"\n}',
                        property:"payload",format:"object"
                    }
                });
            }, done);
        });
    });

    it('should truncated a long message', function(done) {
        var flow = [{id:"n1", type:"debug" }];
        helper.load(debugNode, flow, function() {
            var n1 = helper.getNode("n1");
            websocket_test(function() {
                n1.emit("input", {payload: Array(1002).join("X")});
            }, function(msg) {
                var a = JSON.parse(msg);
                a.should.eql({
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg: Array(1001).join("X")+' ....',
                        property:"payload",
                        format:"string"
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
                n1.emit("input", {payload: new Buffer('HELLO', 'utf8')});
            }, function(msg) {
                JSON.parse(msg).should.eql({
                    topic:"debug",
                    data:{
                        id:"n1",
                        msg: '48454c4c4f',
                        property:"payload",
                        format: "buffer"
                    }
                });
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
                JSON.parse(msg).should.eql({
                    topic:"debug",data:{id:"n1",msg:"message 2",property:"payload",format:"string"}
                });
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

});

function websocket_test(open_callback, message_callback, done_callback) {
    var ws = new WebSocket(helper.url() + "/comms");
    var close_callback = function() { ws.close(); };
    ws.on('open', function() { open_callback(close_callback); });
    ws.on('message', function(msg) {
        message_callback(msg, close_callback);
        ws.close();
        done_callback();
    });
}
