const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");

const telemetryApi = NR_TEST_UTILS.require("@node-red/runtime/lib/telemetry/index");

describe("telemetry", function() {

    afterEach(function () {
        telemetryApi.stop()
        messages = []
    })

    let messages = []

    function getMockRuntime(settings) {
        return {
            settings: {
                get: key => { return settings[key] },
                set: (key, value) => { settings[key] = value },
                available: () => true,
            },
            log: {
                debug: (msg) => { messages.push(msg)}
            }
        }
    }

    // Principles to test:
    // - No settings at all; disable telemetry
    // - Runtime settings only; do what it says
    // - User settings take precedence over runtime settings

    it('Disables telemetry with no settings present', function () {
        telemetryApi.init(getMockRuntime({}))
        messages.should.have.length(0)
        // Returns undefined as we don't know either way
        ;(telemetryApi.isEnabled() === undefined).should.be.true()
    })
    it('Runtime settings - enable', function () {
        // Enabled in runtime settings
        telemetryApi.init(getMockRuntime({
            telemetry: { enabled: true }
        }))
        telemetryApi.isEnabled().should.be.true()
        messages.should.have.length(1)
        ;/Telemetry enabled/.test(messages[0]).should.be.true()
    })
    it('Runtime settings - disable', function () {
        telemetryApi.init(getMockRuntime({
            telemetry: { enabled: false },
        }))
        // Returns false, not undefined
        telemetryApi.isEnabled().should.be.false()
        messages.should.have.length(0)
    })

    it('User settings - enable overrides runtime settings', function () {
        telemetryApi.init(getMockRuntime({
            telemetry: { enabled: false },
            telemetryEnabled: true
        }))
        telemetryApi.isEnabled().should.be.true()
        messages.should.have.length(1)
        ;/Telemetry enabled/.test(messages[0]).should.be.true()
    })

    it('User settings - disable overrides runtime settings', function () {
        telemetryApi.init(getMockRuntime({
            telemetry: { enabled: true },
            telemetryEnabled: false
        }))
        telemetryApi.isEnabled().should.be.false()
        messages.should.have.length(0)
    })
    
    it('Can enable/disable telemetry', function () {
        const settings = {}
        telemetryApi.init(getMockRuntime(settings))
        ;(telemetryApi.isEnabled() === undefined).should.be.true()

        telemetryApi.enable()

        telemetryApi.isEnabled().should.be.true()
        messages.should.have.length(1)
        ;/Telemetry enabled/.test(messages[0]).should.be.true()
        settings.should.have.property('telemetryEnabled', true)

        telemetryApi.disable()

        telemetryApi.isEnabled().should.be.false()
        messages.should.have.length(2)
        ;/Telemetry disabled/.test(messages[1]).should.be.true()
        settings.should.have.property('telemetryEnabled', false)

    })
})