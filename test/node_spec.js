var should = require("should");
var RedNodes = require("../red/nodes.js");

var RedNode = RedNodes.Node;

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
            n.on('close',done);
            n.close();
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
    });
    
});
