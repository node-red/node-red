const should = require("should");
const sinon = require("sinon");
const NR_TEST_UTILS = require("nr-test-utils");

const plugins = NR_TEST_UTILS.require("@node-red/runtime/lib/plugins");

describe("runtime/plugins",function() {

    it.skip("delegates all functions to registry module", function() {
        // There's no easy way to test this as we can't stub the registry functions
        // before the plugin module gets a reference to them
    })
});
