const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");

const api = NR_TEST_UTILS.require("@node-red/runtime/lib/telemetry/metrics/03-env");

describe("telemetry metrics/03-env", function() {

    it('reports env metrics', function () {
        const result = api({
            settings: {
                version: '1.2.3'
            }
        })
        result.should.have.property("env.nodejs", process.version.replace(/^v/, ''))
        result.should.have.property("env.node-red", '1.2.3')
    })
})