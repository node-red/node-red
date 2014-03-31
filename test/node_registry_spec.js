var should = require("should");
var RedNodes = require("../red/nodes.js");

var RedNode = RedNodes.Node;

describe('NodeRegistry', function() {
    it('automatically registers new nodes',function() {
        var testNode = RedNodes.getNode('123');
        should.not.exist(n);
        var n = new RedNode({id:'123',type:'abc'});
        
        var newNode = RedNodes.getNode('123');
        
        should.strictEqual(n,newNode);
    });
})
        

