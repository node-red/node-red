/**
 * Copyright 2014, 2015 IBM Corp.
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
var sinon = require('sinon');
var RedNode = require("../../../red/nodes/Node");
var Log = require("../../../red/log");
var flows = require("../../../red/nodes/flows");
var comms = require('../../../red/comms');

describe('Node', function() {
    describe('#constructor',function() {
        it('is called with an id and a type',function() {
            var n = new RedNode({id:'123',type:'abc'});
            n.should.have.property('id','123');
            n.should.have.property('type','abc');
            n.should.not.have.property('name');
            n.wires.should.be.empty;
        });

        it('is called with an id, a type and a name',function() {
            var n = new RedNode({id:'123',type:'abc',name:'barney'});
            n.should.have.property('id','123');
            n.should.have.property('type','abc');
            n.should.have.property('name','barney');
            n.wires.should.be.empty;
        });

        it('is called with an id, a type and some wires',function() {
            var n = new RedNode({id:'123',type:'abc',wires:['123','456']});
            n.should.have.property('id','123');
            n.should.have.property('type','abc');
            n.should.not.have.property('name');
            n.wires.should.have.length(2);
        });

    });

    describe('#close', function() {
        it('emits close event when closed',function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            n.on('close',function() {
                done();
            });
            var p = n.close();
            should.not.exist(p);
        });

        it('returns a promise when provided a callback with a done parameter',function(testdone) {
            var n = new RedNode({id:'123',type:'abc'});
            n.on('close',function(done) {
                setTimeout(function() {
                    done();
                },200);
            });
            var p = n.close();
            should.exist(p);
            p.then(function() {
                testdone();
            });
        });

        it('allows multiple close handlers to be registered',function(testdone) {
            var n = new RedNode({id:'123',type:'abc'});
            var callbacksClosed = 0;
            n.on('close',function(done) {
                setTimeout(function() {
                    callbacksClosed++;
                    done();
                },200);
            });
            n.on('close',function(done) {
                setTimeout(function() {
                    callbacksClosed++;
                    done();
                },200);
            });
            n.on('close',function() {
                callbacksClosed++;
            });
            var p = n.close();
            should.exist(p);
            p.then(function() {
                callbacksClosed.should.eql(3);
                testdone();
            }).otherwise(function(e) {
                testdone(e);
            });
        });
    });


    describe('#receive', function() {
        it('emits input event when called', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var message = {payload:"hello world"};
            n.on('input',function(msg) {
                should.deepEqual(msg,message);
                done();
            });
            n.receive(message);
        });

        it('writes metric info with undefined msg', function(done){
            var n = new RedNode({id:'123',type:'abc'});
            n.on('input',function(msg) {
                (typeof msg).should.not.be.equal("undefined");
                (typeof msg._msgid).should.not.be.equal("undefined");
                done();
            });
            n.receive();
        });

        it('writes metric info with null msg', function(done){
            var n = new RedNode({id:'123',type:'abc'});
            n.on('input',function(msg) {
                (typeof msg).should.not.be.equal("undefined");
                (typeof msg._msgid).should.not.be.equal("undefined");
                done();
            });
            n.receive(null);
        });
        
        it('handles thrown errors', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            sinon.stub(n,"error",function(err,msg) {});
            var message = {payload:"hello world"};
            n.on('input',function(msg) {
                throw new Error("test error");
            });
            n.receive(message);
            n.error.called.should.be.true;
            n.error.firstCall.args[1].should.equal(message);
            done();
            
        });
    });

    describe('#send', function() {

        it('emits a single message', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':n1,'n2':n2}[id];
            });
            var message = {payload:"hello world"};

            n2.on('input',function(msg) {
                // msg equals message, and is not a new copy
                should.deepEqual(msg,message);
                should.strictEqual(msg,message);
                flowGet.restore();
                done();
            });

            n1.send(message);
        });

        it('emits multiple messages on a single output', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':n1,'n2':n2}[id];
            });

            var messages = [
                {payload:"hello world"},
                {payload:"hello world again"}
            ];

            var rcvdCount = 0;

            n2.on('input',function(msg) {
                if (rcvdCount === 0) {
                    // first msg sent, don't clone
                    should.deepEqual(msg,messages[rcvdCount]);
                    should.strictEqual(msg,messages[rcvdCount]);
                    rcvdCount += 1;
                } else {
                    // second msg sent, clone
                    msg.payload.should.equal(messages[rcvdCount].payload);
                    should.notStrictEqual(msg,messages[rcvdCount]);
                    flowGet.restore();
                    done();
                }
            });
            n1.send([messages]);
        });

        it('emits messages to multiple outputs', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2'],['n3'],['n4','n5']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var n3 = new RedNode({id:'n3',type:'abc'});
            var n4 = new RedNode({id:'n4',type:'abc'});
            var n5 = new RedNode({id:'n5',type:'abc'});
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':n1,'n2':n2,'n3':n3,'n4':n4,'n5':n5}[id];
            });

            var messages = [
                {payload:"hello world"},
                null,
                {payload:"hello world again"}
            ];

            var rcvdCount = 0;

            // first message sent, don't clone
            // message uuids should match
            n2.on('input',function(msg) {
                should.deepEqual(msg,messages[0]);
                should.strictEqual(msg,messages[0]);
                rcvdCount += 1;
                if (rcvdCount == 3) {
                    flowGet.restore();
                    done();
                }
            });

            n3.on('input',function(msg) {
                    should.fail(null,null,"unexpected message");
            });

            // second message sent, clone
            // message uuids wont match since we've cloned
            n4.on('input',function(msg) {
                msg.payload.should.equal(messages[2].payload);
                should.notStrictEqual(msg,messages[2]);
                rcvdCount += 1;
                if (rcvdCount == 3) {
                    flowGet.restore();
                    done();
                }
            });

            // third message sent, clone
            // message uuids wont match since we've cloned
            n5.on('input',function(msg) {
                msg.payload.should.equal(messages[2].payload);
                should.notStrictEqual(msg,messages[2]);
                rcvdCount += 1;
                if (rcvdCount == 3) {
                    flowGet.restore();
                    done();
                }
            });

            n1.send(messages);
        });

        it('emits no messages', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':n1,'n2':n2}[id];
            });

            n2.on('input',function(msg) {
                should.fail(null,null,"unexpected message");
            });

            setTimeout(function() {
                flowGet.restore();
                done();
            }, 200);

            n1.send();
        });

        it('emits messages ignoring non-existent nodes', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n9'],['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':n1,'n2':n2}[id];
            });

            var messages = [
                {payload:"hello world"},
                {payload:"hello world again"}
            ];

            // only one message sent, so no copy needed
            n2.on('input',function(msg) {
                should.deepEqual(msg,messages[1]);
                should.strictEqual(msg,messages[1]);
                flowGet.restore();
                done();
            });

            n1.send(messages);
        });

        it('emits messages without cloning req or res', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[[['n2'],['n3']]]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var n3 = new RedNode({id:'n3',type:'abc'});
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':n1,'n2':n2,'n3':n3}[id];
            });

            var req = {};
            var res = {};
            var cloned = {};
            var message = {payload: "foo", cloned: cloned, req: req, res: res};

            var rcvdCount = 0;

            // first message to be sent, so should not be cloned
            n2.on('input',function(msg) {
                should.deepEqual(msg, message);
                msg.cloned.should.be.exactly(message.cloned);
                msg.req.should.be.exactly(message.req);
                msg.res.should.be.exactly(message.res);
                rcvdCount += 1;
                if (rcvdCount == 2) {
                    flowGet.restore();
                    done();
                }
            });

            // second message to be sent, so should be cloned
            // message uuids wont match since we've cloned
            n3.on('input',function(msg) {
                msg.payload.should.equal(message.payload);
                msg.cloned.should.not.be.exactly(message.cloned);
                msg.req.should.be.exactly(message.req);
                msg.res.should.be.exactly(message.res);
                rcvdCount += 1;
                if (rcvdCount == 2) {
                    flowGet.restore();
                    done();
                }
            });

            n1.send(message);
        });

         it("logs the uuid for all messages sent", function(done) {
            var flowGet = sinon.stub(flows,"get",function(id) {
                return {'n1':sender,'n2':receiver1,'n3':receiver2}[id];
            });
            var logHandler = {
                messagesSent: 0,
                emit: function(event, msg) {
                    if (msg.event == "node.abc.send" && msg.level == Log.METRIC) {
                        this.messagesSent++;
                        (typeof msg.msgid).should.not.be.equal("undefined");
                        flowGet.restore();
                        done();
                    }
                }
            };

            Log.addHandler(logHandler);

            var sender = new RedNode({id:'n1',type:'abc', wires:[['n2', 'n3']]});
            var receiver1 = new RedNode({id:'n2',type:'abc'});
            var receiver2 = new RedNode({id:'n3',type:'abc'});
            sender.send({"some": "message"});
        })
    });


    describe('#log', function() {
        it('produces a log message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            n.log("a log message");
            should.deepEqual({level:Log.INFO, id:n.id,
                               type:n.type, msg:"a log message", }, loginfo);
            Log.log.restore();
            done();
        });
        it('produces a log message with a name', function(done) {
            var n = new RedNode({id:'123', type:'abc', name:"barney"});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            n.log("a log message");
            should.deepEqual({level:Log.INFO, id:n.id, name: "barney",
                              type:n.type, msg:"a log message"}, loginfo);
            Log.log.restore();
            done();
        });
    });

    describe('#warn', function() {
        it('produces a warning message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            n.warn("a warning");
            should.deepEqual({level:Log.WARN, id:n.id,
                              type:n.type, msg:"a warning"}, loginfo);
            Log.log.restore();
            done();
        });
    });

    describe('#error', function() {
        it('handles a null error message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            sinon.stub(flows,"handleError", function(node,message,msg) {
            });

            var message = {a:1};

            n.error(null,message);
            should.deepEqual({level:Log.ERROR, id:n.id, type:n.type, msg:""}, loginfo);

            flows.handleError.called.should.be.true;
            flows.handleError.args[0][0].should.eql(n);
            flows.handleError.args[0][1].should.eql("");
            flows.handleError.args[0][2].should.eql(message);

            Log.log.restore();
            flows.handleError.restore();
            done();
        });

        it('produces an error message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            sinon.stub(flows,"handleError", function(node,message,msg) {
            });

            var message = {a:2};

            n.error("This is an error",message);
            should.deepEqual({level:Log.ERROR, id:n.id, type:n.type, msg:"This is an error"}, loginfo);

            flows.handleError.called.should.be.true;
            flows.handleError.args[0][0].should.eql(n);
            flows.handleError.args[0][1].should.eql("This is an error");
            flows.handleError.args[0][2].should.eql(message);

            Log.log.restore();
            flows.handleError.restore();
            done();
        });

    });

    describe('#metric', function() {
        it('produces a metric message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            var msg = {payload:"foo", _msgid:"987654321"};
            n.metric("test.metric",msg,"15mb");
            should.deepEqual({value:"15mb", level:Log.METRIC, nodeid:n.id,
                                  event:"node.abc.test.metric",msgid:"987654321"}, loginfo);
            Log.log.restore();
            done();
        });
    });

    describe('#metric', function() {
        it('returns metric value if eventname undefined', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            var msg = {payload:"foo", _msgid:"987654321"};
            var m = n.metric(undefined,msg,"15mb");
            m.should.be.a.boolean;
            Log.log.restore();
            done();
        });
        it('returns not defined if eventname defined', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            var msg = {payload:"foo", _msgid:"987654321"};
            var m = n.metric("info",msg,"15mb");
            should(m).be.undefined;
            Log.log.restore();
            done();
        });
    });

    describe('#status', function() {
        after(function() {
            comms.publish.restore();
        });
        it('publishes status', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            var status = {fill:"green",shape:"dot",text:"connected"};
            sinon.stub(comms, 'publish', function(topic, message, retain) {
                topic.should.equal('status/123');
                message.should.equal(status);
                retain.should.be.true;
                done();
            });

            n.status(status);
        });
    });

});
