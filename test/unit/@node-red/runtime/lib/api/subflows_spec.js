var should = require("should");
var sinon = require("sinon");

var NR_TEST_UTILS = require("nr-test-utils");
var subflows = NR_TEST_UTILS.require("@node-red/runtime/lib/api/subflows")

var mockLog = {
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
}

describe("runtime-api/subflows", function() {
    describe("createSubflow", function() {
        before(function() {
            subflows.init({
                log: mockLog,
                subflows: {
                    createSubflow: function(meta, flow) {
                        return Promise.resolve();
                    }
                }
            });
        });
        it("return a module", function(done) {
            subflows.createSubflow({
                meta: {
                    module: "name-of-module"
                },
                flow: {}
            }).then(function(result) {
                done();
            }).catch(function(err) {
                err.should.have.property("status",400);
                done();
            }).catch(done)
        });
    });

});
