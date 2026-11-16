const should = require("should");
const request = require('supertest');
const express = require('express');
const bodyParser = require("body-parser");

var app;

var NR_TEST_UTILS = require("nr-test-utils");

var plugins = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/plugins");

describe("api/editor/plugins", function() {
    const pluginList = [
        {
            "id": "test-module/test-set",
            "enabled": true,
            "local": false,
            "plugins": [
                {
                    "type": "foo",
                    "id": "a-plugin",
                    "module": "test-module"
                },
                {
                    "type": "bar",
                    "id": "a-plugin2",
                    "module": "test-module"
                },
                {
                    "type": "foo",
                    "id": "a-plugin3",
                    "module": "test-module"
                }
            ]
        },
        {
            "id": "test-module/test-disabled-set",
            "enabled": false,
            "local": false,
            "plugins": []
        }
    ];
    const pluginConfigs = `
<!-- --- [red-plugin:test-module/test-set] --- -->
test-module-config`;

    const pluginCatalogs = { "test-module": {"foo": "bar"}};

    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/plugins",plugins.getAll);
        app.get("/plugins/messages",plugins.getCatalogs);

        plugins.init({
            plugins: {
                getPluginList: async function() { return pluginList },
                getPluginConfigs: async function() { return pluginConfigs },
                getPluginCatalogs: async function() { return pluginCatalogs }
            }
        })
    });

    it('returns the list of plugins', function(done) {
        request(app)
        .get("/plugins")
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            try {
                JSON.stringify(res.body).should.eql(JSON.stringify(pluginList));
                done();
            } catch(err) {
                done(err)
            }
        });
    });
    it('returns the plugin configs', function(done) {
        request(app)
        .get("/plugins")
        .set('Accept', 'text/html')
        .expect(200)
        .expect(pluginConfigs)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            done();
        });
    });
    it('returns the plugin catalogs', function(done) {
        request(app)
        .get("/plugins/messages")
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            try {
                JSON.stringify(res.body).should.eql(JSON.stringify(pluginCatalogs));
                done();
            } catch(err) {
                done(err)
            }
        });
    });

    describe("error handling", function() {
        before(function() {
            const errInstance = new Error("message");
            errInstance.code = "random_error";
            errInstance.status = 400;
            plugins.init({
                plugins: {
                    getPluginList: async function() { throw errInstance },
                    // res.send throws when given a function
                    getPluginConfigs: async function() { return Object },
                    getPluginCatalogs: async function() { return pluginCatalogs }
                }
            })
        });
        after(function() {
            plugins.init({
                plugins: {
                    getPluginList: async function() { return pluginList },
                    getPluginConfigs: async function() { return pluginConfigs },
                    getPluginCatalogs: async function() { return pluginCatalogs }
                }
            })
        });
        it('returns error if plugin list fails', function(done) {
            request(app)
            .get("/plugins")
            .set('Accept', 'application/json')
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.property("code","random_error");
                    done();
                } catch(err) {
                    done(err)
                }
            });
        });
        it('returns error if plugin configs cannot be sent', function(done) {
            request(app)
            .get("/plugins")
            .set('Accept', 'text/html')
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.property("code","ERR_INVALID_ARG_TYPE");
                    done();
                } catch(err) {
                    done(err)
                }
            });
        });
    });
});
