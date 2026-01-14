const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");

const api = NR_TEST_UTILS.require("@node-red/runtime/lib/telemetry/metrics/02-os");

describe("telemetry metrics/02-os", function() {

    it('reports os metrics', function () {
        const result = api()
        result.should.have.property("os.type")
        result.should.have.property("os.release")
        result.should.have.property("os.arch")
    })
})