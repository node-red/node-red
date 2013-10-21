var should = require("should");
var RedNodes = require("../red/nodes.js");

var RedNode = RedNodes.Node;

describe('NodeRegistry', function() {
    it('automatically registers new nodes',function() {
        should.not.exist(RedNodes.getNode('123'));
        var n = new RedNode({id:'123',type:'abc'});
        should.strictEqual(n,RedNodes.getNode('123'));
    });
})
        

