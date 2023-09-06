var should = require("should");
var config = require("nr-test-utils").require("@node-red/nodes/core/common/91-global-config.js");
var inject = require("nr-test-utils").require("@node-red/nodes/core/common/20-inject.js");
var helper = require("node-red-node-test-helper");

describe('Global Config Node', function() {

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"global-config", name: "XYZ" }];
        helper.load(config, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property("name", "XYZ");
            done();
        });
    });

    it('should access global environment variable', function(done) {
        var flow = [{id:"n1", type:"global-config", name: "XYZ",
                     env: [ {
                         name: "X",
                         type: "string",
                         value: "foo"
                     }]
                    },
                    {id: "n2", type: "inject", topic: "t1", payload: "X", payloadType: "env", wires: [["n3"]], z: "flow"},
                    {id: "n3", type: "helper"}
                   ];
        helper.load([config, inject], flow, function() {
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            n3.on("input", (msg) => {
                try {
                    msg.should.have.property("payload", "foo");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n2.receive({});
        });
    });

    it('should evaluate a global environment variable that is a JSONata value', function (done) {
        const flow = [{
            id: "n1", type: "global-config", name: "XYZ",
            env: [
                { name: "now-var", type: "jsonata", value: "$millis()" }
            ]
        },
        { id: "n2", type: "inject", topic: "t1", payload: "now-var", payloadType: "env", wires: [["n3"]], z: "flow" },
        { id: "n3", type: "helper" }
        ];
        helper.load([config, inject], flow, function () {
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            n3.on("input", (msg) => {
                try {
                    const now = Date.now();
                    msg.should.have.property("payload").and.be.approximately(now, 1000);
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n2.receive({});
        });
    });

});
