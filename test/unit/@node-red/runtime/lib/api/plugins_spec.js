const should = require("should");
const sinon = require("sinon");

const NR_TEST_UTILS = require("nr-test-utils");
const plugins = NR_TEST_UTILS.require("@node-red/runtime/lib/api/plugins")

const mockLog = () => ({
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
})

describe("runtime-api/plugins", function() {
    const pluginList = [{id:"one",module:'test-module'},{id:"two",module:"node-red"}];
    const pluginConfigs = "123";

    describe("getPluginList", function() {
        it("gets the plugin list", function() {
            plugins.init({
                log: mockLog(),
                plugins: {
                    getPluginList: function() { return pluginList}
                }
            });
            return plugins.getPluginList({}).then(function(result) {
                result.should.eql(pluginList);
            })
        });
    });
    describe("getPluginConfigs", function() {
        it("gets the plugin configs", function() {
            plugins.init({
                log: mockLog(),
                plugins: {
                    getPluginConfigs: function() { return pluginConfigs}
                }
            });
            return plugins.getPluginConfigs({}).then(function(result) {
                result.should.eql(pluginConfigs);
            })
        });
    });
    describe("getPluginCatalogs", function() {
        it("gets the plugin catalogs", function() {
            plugins.init({
                log: mockLog(),
                plugins: {
                    getPluginList: function() { return pluginList}
                },
                i18n: {
                    i: {
                        changeLanguage: function(lang,done) { done && done() },
                        getResourceBundle: function(lang, id) { return {lang,id}}
                    }
                }
            });
            return plugins.getPluginCatalogs({lang: "en-US"}).then(function(result) {
                JSON.stringify(result).should.eql(JSON.stringify({ one: { lang: "en-US", id: "one" } }))
            })
        });
    });

});