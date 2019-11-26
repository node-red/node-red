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
var sinon = require('sinon');
var NR_TEST_UTILS = require("nr-test-utils");
var RedNode = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/Node");
var Log = NR_TEST_UTILS.require("@node-red/util").log;
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/flows");

describe('Node', function() {
    describe('#constructor',function() {
        it('is called with an id and a type',function() {
            var n = new RedNode({id:'123',type:'abc'});
            n.should.have.property('id','123');
            n.should.have.property('type','abc');
            n.should.not.have.property('name');
            n.wires.should.be.empty();
        });

        it('is called with an id, a type and a name',function() {
            var n = new RedNode({id:'123',type:'abc',name:'barney'});
            n.should.have.property('id','123');
            n.should.have.property('type','abc');
            n.should.have.property('name','barney');
            n.wires.should.be.empty();
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
            n.close();
        });

        it('returns a promise when provided a callback with a done parameter',function(testdone) {
            var n = new RedNode({id:'123',type:'abc'});
            n.on('close',function(done) {
                setTimeout(function() {
                    done();
                },50);
            });
            var p = n.close();
            should.exist(p);
            p.then(function() {
                testdone();
            });
        });
        it('accepts a callback with "removed" and "done" parameters', function(testdone) {
            var n = new RedNode({id:'123',type:'abc'});
            var receivedRemoved;
            n.on('close',function(removed,done) {
                receivedRemoved = removed;
                setTimeout(function() {
                    done();
                },50);
            });
            var p = n.close(true);
            should.exist(p);
            (receivedRemoved).should.be.true();
            p.then(function() {
                testdone();
            });
        })
        it('allows multiple close handlers to be registered',function(testdone) {
            var n = new RedNode({id:'123',type:'abc'});
            var callbacksClosed = 0;
            n.on('close',function(done) {
                setTimeout(function() {
                    callbacksClosed++;
                    done();
                },50);
            });
            n.on('close',function(done) {
                setTimeout(function() {
                    callbacksClosed++;
                    done();
                },75);
            });
            n.on('close',function() {
                callbacksClosed++;
            });
            var p = n.close();
            should.exist(p);
            p.then(function() {
                callbacksClosed.should.eql(3);
                testdone();
            }).catch(function(e) {
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
            setTimeout(function() {
                n.error.called.should.be.true();
                n.error.firstCall.args[1].should.equal(message);
                done();
            },50);
        });

        it('calls parent flow handleComplete when callback provided', function(done) {
            var n = new RedNode({id:'123',type:'abc', _flow: {
                handleComplete: function(node,msg) {
                    try {
                        msg.should.deepEqual(message);
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            }});

            var message = {payload:"hello world"};
            n.on('input',function(msg, nodeSend, nodeDone) {
                nodeDone();
            });
            n.receive(message);
        });
        it('logs error if callback provides error', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            sinon.stub(n,"error",function(err,msg) {});

            var message = {payload:"hello world"};
            n.on('input',function(msg, nodeSend, nodeDone) {
                nodeDone(new Error("test error"));
                setTimeout(function() {
                    try {
                        n.error.called.should.be.true();
                        n.error.firstCall.args[0].toString().should.equal("Error: test error");
                        n.error.firstCall.args[1].should.equal(message);
                        done();
                    } catch(err) {
                        done(err);
                    }
                },50);
            });
            n.receive(message);
        });
    });

    describe('#send', function() {

        it('emits a single message', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2}[id]},
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});
            var message = {payload:"hello world"};
            var messageReceived = false;
            n2.on('input',function(msg) {
                // msg equals message, and is not a new copy
                messageReceived = true;
                should.deepEqual(msg,message);
                should.strictEqual(msg,message);
                done();
            });
            n1.send(message);
            messageReceived.should.be.false();
        });

        it('emits a single message - synchronous mode', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2}[id]},
                asyncMessageDelivery: false
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});
            var message = {payload:"hello world"};
            var messageReceived = false;
            var notSyncErr;
            n2.on('input',function(msg) {
                try {
                    // msg equals message, and is not a new copy
                    messageReceived = true;
                    should.deepEqual(msg,message);
                    should.strictEqual(msg,message);
                    done(notSyncErr);
                } catch(err) {
                    done(err);
                }
            });
            n1.send(message);
            try {
                messageReceived.should.be.true();
            } catch(err) {
                notSyncErr = err;
            }
        });

        it('emits a message with callback provided send', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2}[id]},
                handleComplete: (node,msg) => {}
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});
            var message = {payload:"hello world"};
            var messageReceived = false;
            n1.on('input',function(msg,nodeSend,nodeDone) {
                nodeSend(msg);
                nodeDone();
            });
            n2.on('input',function(msg) {
                // msg equals message, and is not a new copy
                messageReceived = true;
                should.deepEqual(msg,message);
                should.strictEqual(msg,message);
                done();
            });
            n1.receive(message);
            messageReceived.should.be.false();
        });

        it('emits multiple messages on a single output', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2}[id]},
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});

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
                    done();
                }
            });
            n1.send([messages]);
        });

        it('emits messages to multiple outputs', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2,'n3':n3,'n4':n4,'n5':n5}[id]},
            };
            var n1 = new RedNode({_flow:flow, id:'n1',type:'abc',wires:[['n2'],['n3'],['n4','n5']]});
            var n2 = new RedNode({_flow:flow, id:'n2',type:'abc'});
            var n3 = new RedNode({_flow:flow, id:'n3',type:'abc'});
            var n4 = new RedNode({_flow:flow, id:'n4',type:'abc'});
            var n5 = new RedNode({_flow:flow, id:'n5',type:'abc'});

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
                    done();
                }
            });

            n1.send(messages);
        });

        it('emits no messages', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2}[id]},
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});

            n2.on('input',function(msg) {
                should.fail(null,null,"unexpected message");
            });

            setTimeout(function() {
                done();
            }, 200);

            n1.send();
        });

        it('emits messages ignoring non-existent nodes', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2}[id]},
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[['n9'],['n2']]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});

            var messages = [
                {payload:"hello world"},
                {payload:"hello world again"}
            ];

            // only one message sent, so no copy needed
            n2.on('input',function(msg) {
                should.deepEqual(msg,messages[1]);
                should.strictEqual(msg,messages[1]);
                done();
            });

            n1.send(messages);
        });

        it('emits messages without cloning req or res', function(done) {
            var flow = {
                getNode: (id) => { return {'n1':n1,'n2':n2,'n3':n3}[id]},
            };
            var n1 = new RedNode({_flow:flow,id:'n1',type:'abc',wires:[[['n2'],['n3']]]});
            var n2 = new RedNode({_flow:flow,id:'n2',type:'abc'});
            var n3 = new RedNode({_flow:flow,id:'n3',type:'abc'});

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
                    done();
                }
            });

            n1.send(message);
        });

         it("logs the uuid for all messages sent", function(done) {
            var logHandler = {
                msgIds:[],
                messagesSent: 0,
                emit: function(event, msg) {
                    if (msg.event == "node.abc.send" && msg.level == Log.METRIC) {
                        this.messagesSent++;
                        this.msgIds.push(msg.msgid);
                        (typeof msg.msgid).should.not.be.equal("undefined");
                    }
                }
            };

            Log.addHandler(logHandler);
            var flow = {
                getNode: (id) => { return {'n1':sender,'n2':receiver1,'n3':receiver2}[id]},
            };

            var sender = new RedNode({_flow:flow,id:'n1',type:'abc', wires:[['n2', 'n3']]});
            var receiver1 = new RedNode({_flow:flow,id:'n2',type:'abc'});
            var receiver2 = new RedNode({_flow:flow,id:'n3',type:'abc'});
            sender.send({"some": "message"});
            setTimeout(function() {
                try {
                    logHandler.messagesSent.should.equal(1);
                    should.exist(logHandler.msgIds[0])
                    Log.removeHandler(logHandler);
                    done();
                } catch(err) {
                    Log.removeHandler(logHandler);
                    done(err);
                }
            },50)
        })
    });


    describe('#log', function() {
        it('produces a log message', function(done) {
            var n = new RedNode({id:'123',type:'abc',z:'789'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            n.log("a log message");
            should.deepEqual({level:Log.INFO, id:n.id,
                               type:n.type, msg:"a log message",z:'789'}, loginfo);
            Log.log.restore();
            done();
        });
        it('produces a log message with a name', function(done) {
            var n = new RedNode({id:'123', type:'abc', name:"barney", z:'789'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            n.log("a log message");
            should.deepEqual({level:Log.INFO, id:n.id, name: "barney",
                              type:n.type, msg:"a log message",z:'789'}, loginfo);
            Log.log.restore();
            done();
        });
    });

    describe('#warn', function() {
        it('produces a warning message', function(done) {
            var n = new RedNode({id:'123',type:'abc',z:'789'});
            var loginfo = {};
            sinon.stub(Log, 'log', function(msg) {
                loginfo = msg;
            });
            n.warn("a warning");
            should.deepEqual({level:Log.WARN, id:n.id,
                              type:n.type, msg:"a warning",z:'789'}, loginfo);
            Log.log.restore();
            done();
        });
    });

    describe('#error', function() {
        it('handles a null error message', function(done) {
            var flow = {
                handleError: sinon.stub()
            }
            var n = new RedNode({_flow:flow, id:'123',type:'abc',z:'789'});
            var message = {a:1};
            n.error(null,message);

            flow.handleError.called.should.be.true();
            flow.handleError.args[0][0].should.eql(n);
            flow.handleError.args[0][1].should.eql("");
            flow.handleError.args[0][2].should.eql(message);

            done();
        });

        it('produces an error message', function(done) {
            var flow = {
                handleError: sinon.stub()
            }
            var n = new RedNode({_flow:flow, id:'123',type:'abc',z:'789'});
            var message = {a:2};

            n.error("This is an error",message);

            flow.handleError.called.should.be.true();
            flow.handleError.args[0][0].should.eql(n);
            flow.handleError.args[0][1].should.eql("This is an error");
            flow.handleError.args[0][2].should.eql(message);

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
            m.should.be.a.Boolean();
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
        it('publishes status', function(done) {
            var flow = {
                handleStatus: sinon.stub()
            }
            var n = new RedNode({_flow:flow,id:'123',type:'abc'});
            var status = {fill:"green",shape:"dot",text:"connected"};

            n.status(status);

            flow.handleStatus.called.should.be.true();
            flow.handleStatus.args[0][0].should.eql(n);
            flow.handleStatus.args[0][1].should.eql(status);
            done();
        });
        it('publishes status for plain string', function(done) {
            var flow = { handleStatus: sinon.stub() }
            var n = new RedNode({_flow:flow,id:'123',type:'abc'});
            n.status("text status");
            flow.handleStatus.called.should.be.true();
            flow.handleStatus.args[0][0].should.eql(n);
            flow.handleStatus.args[0][1].should.eql({text:"text status"});
            done();
        });
        it('publishes status for plain boolean', function(done) {
            var flow = { handleStatus: sinon.stub() }
            var n = new RedNode({_flow:flow,id:'123',type:'abc'});
            n.status(false);
            flow.handleStatus.called.should.be.true();
            flow.handleStatus.args[0][0].should.eql(n);
            flow.handleStatus.args[0][1].should.eql({text:"false"});
            done();
        });
        it('publishes status for plain number', function(done) {
            var flow = { handleStatus: sinon.stub() }
            var n = new RedNode({_flow:flow,id:'123',type:'abc'});
            n.status(123);
            flow.handleStatus.called.should.be.true();
            flow.handleStatus.args[0][0].should.eql(n);
            flow.handleStatus.args[0][1].should.eql({text:"123"});
            done();
        });
    });

});
