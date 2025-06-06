
var should = require("should");
var catchNode = require("nr-test-utils").require("@node-red/nodes/core/common/24-complete.js");
var helper = require("node-red-node-test-helper");

describe('complete Node', function() {

    afterEach(function() {
        helper.unload();
    });

    it('should output a message when called', function(done) {
        var flow = [ { id:"n1", type:"complete", name:"status", wires:[["n2"]], scope:[] },
            {id:"n2", type:"helper"} ];
        helper.load(catchNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.should.have.property('name', 'status');
            n2.on("input", function(msg) {
                msg.text.should.equal("Oh dear");
                msg.should.have.property('source');
                msg.source.should.have.property('id',"12345");
                msg.source.should.have.property('type',"testnode");
                msg.source.should.have.property('name',"fred");
                done();
            });
            var mst = {
                text: "Oh dear",
                source: {
                    id: "12345",
                    type: "testnode",
                    name: "fred"
                }
            }
            n1.emit("input", mst);
        });
    });

});
