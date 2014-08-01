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
var sinon = require('sinon');
var RedNode = require("../../../red/nodes/Node");
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
    });
    
    describe('#send', function() {
            
        it('emits a single message', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var message = {payload:"hello world"};
            
            n2.on('input',function(msg) {
                // msg equals message, but is a new copy
                should.deepEqual(msg,message);
                should.notStrictEqual(msg,message);
                done();
            });
            
            n1.send(message);
        });
        
        it('emits multiple messages on a single output', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            
            var messages = [
                {payload:"hello world"},
                {payload:"hello world again"}
            ];
            
            var rcvdCount = 0;
            
            n2.on('input',function(msg) {
                should.deepEqual(msg,messages[rcvdCount]);
                should.notStrictEqual(msg,messages[rcvdCount]);
                rcvdCount += 1;
                if (rcvdCount == 2) {
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
            
            var messages = [
                {payload:"hello world"},
                null,
                {payload:"hello world again"}
            ];
            
            var rcvdCount = 0;
            
            n2.on('input',function(msg) {
                should.deepEqual(msg,messages[0]);
                should.notStrictEqual(msg,messages[0]);
                rcvdCount += 1;
                if (rcvdCount == 3) {
                    done();
                }
            });
            
            n3.on('input',function(msg) {
                    should.fail(null,null,"unexpected message");
            });
            
            n4.on('input',function(msg) {
                should.deepEqual(msg,messages[2]);
                should.notStrictEqual(msg,messages[2]);
                rcvdCount += 1;
                if (rcvdCount == 3) {
                    done();
                }
            });
            
            n5.on('input',function(msg) {
                should.deepEqual(msg,messages[2]);
                should.notStrictEqual(msg,messages[2]);
                rcvdCount += 1;
                if (rcvdCount == 3) {
                    done();
                }
            });
            
            n1.send(messages);
        });

        it('emits no messages', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});

            n2.on('input',function(msg) {
                should.fail(null,null,"unexpected message");
            });
            
            setTimeout(function() {
                done();
            }, 200);
            
            n1.send();
        });

        it('emits messages ignoring non-existent nodes', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n9'],['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});

            var messages = [
                {payload:"hello world"},
                {payload:"hello world again"}
            ];

            n2.on('input',function(msg) {
                should.deepEqual(msg,messages[1]);
                should.notStrictEqual(msg,messages[1]);
                done();
            });

            n1.send(messages);
        });

        it('emits messages without cloning req or res', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});

            var req = {};
            var res = {};
            var cloned = {};
            var message = {payload: "foo", cloned: cloned, req: req, res: res};

            n2.on('input',function(msg) {
                should.deepEqual(msg, message);
                msg.cloned.should.not.be.exactly(message.cloned);
                msg.req.should.be.exactly(message.req);
                msg.res.should.be.exactly(message.res);
                done();
            });

            n1.send(message);
        });

    });

    describe('#log', function() {
        it('emits a log message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            n.on('log',function(obj) {
                should.deepEqual({level:"log", id:n.id,
                                  type:n.type, msg:"a log message"}, obj);
                done();
            });
            n.log("a log message");
        });
    });

    describe('#log', function() {
        it('emits a log message with a name', function(done) {
            var n = new RedNode({id:'123', type:'abc', name:"barney"});
            n.on('log',function(obj) {
                should.deepEqual({level:"log", id:n.id, name: "barney",
                                  type:n.type, msg:"a log message"}, obj);
                done();
            });
            n.log("a log message");
        });
    });

    describe('#warn', function() {
        it('emits a warning', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            n.on('log',function(obj) {
                should.deepEqual({level:"warn", id:n.id,
                                  type:n.type, msg:"a warning"}, obj);
                done();
            });
            n.warn("a warning");
        });
    });

    describe('#error', function() {
        it('emits an error message', function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            n.on('log',function(obj) {
                should.deepEqual({level:"error", id:n.id,
                                  type:n.type, msg:"an error message"}, obj);
                done();
            });
            n.error("an error message");
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
