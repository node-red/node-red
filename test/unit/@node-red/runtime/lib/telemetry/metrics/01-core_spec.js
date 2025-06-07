const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");

const api = NR_TEST_UTILS.require("@node-red/runtime/lib/telemetry/metrics/01-core");

describe("telemetry metrics/01-core", function() {

    it('reports core metrics', function () {
        const result = api({
            settings: {
                get: key => { return {instanceId: "1234"}[key]}
            }
        })
        result.should.have.property("instanceId", "1234")
    })
})