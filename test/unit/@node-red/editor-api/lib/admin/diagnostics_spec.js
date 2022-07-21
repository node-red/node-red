const should = require("should");
const request = require('supertest');
const express = require('express');
const bodyParser = require("body-parser");
const sinon = require('sinon');

let app;

const NR_TEST_UTILS = require("nr-test-utils");
const diagnostics = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/diagnostics");

describe("api/editor/diagnostics", function() {
    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/diagnostics",diagnostics.getReport);
    });

    it('returns the diagnostics report when explicitly enabled', function(done) {
        const settings = { diagnostics: { ui: true, enabled: true } }
        const runtimeAPI  = {
            diagnostics: {
                get: async function (opts) {
                    return new Promise(function (resolve, reject) {
                        opts = opts || {}
                        try {
                            resolve({ opts: opts, a:1, b:2});
                        } catch (error) {
                            error.status = 500;
                            reject(error);
                        }
                    })
                }
            }
        }

        diagnostics.init(settings, runtimeAPI);

        request(app)
        .get("/diagnostics")
        .expect(200)
        .end(function(err,res) {
            if (err || typeof res.error === "object") {
                return done(err || res.error);
            }
            res.should.have.property("statusCode",200);
            res.body.should.have.property("a",1);
            res.body.should.have.property("b",2);
            done();
        });
    });
    it('returns the diagnostics report when not explicitly enabled (implicitly enabled)', function(done) {
        const settings = { diagnostics: { enabled: undefined } }
        const runtimeAPI  = {
            diagnostics: {
                get: async function (opts) {
                    return new Promise(function (resolve, reject) {
                        opts = opts || {}
                        try {
                            resolve({ opts: opts, a:3, b:4});
                        } catch (error) {
                            error.status = 500;
                            reject(error);
                        }
                    })
                }
            }
        }

        diagnostics.init(settings, runtimeAPI);

        request(app)
        .get("/diagnostics")
        .expect(200)
        .end(function(err,res) {
            if (err || typeof res.error === "object") {
                return done(err || res.error);
            }
            res.should.have.property("statusCode",200);
            res.body.should.have.property("a",3);
            res.body.should.have.property("b",4);
            done();
        });
    });
    it('should error when setting is disabled', function(done) {
        const settings = { diagnostics: { ui: true, enabled: false } }
        const runtimeAPI  = {
            diagnostics: {
                get: async function (opts) {
                    return new Promise(function (resolve, reject) {
                        opts = opts || {}
                        try {
                            resolve({ opts: opts});
                        } catch (error) {
                            error.status = 500;
                            reject(error);
                        }
                    })
                }
            }
        }

        diagnostics.init(settings, runtimeAPI);

        request(app)
        .get("/diagnostics")
        .expect(403)
        .end(function(err,res) {
            if (!err && typeof res.error !== "object") {
                return done(new Error("accessing diagnostics endpoint while disabled should raise error"));
            }
            res.should.have.property("statusCode",403);
            res.body.should.have.property("message","diagnostics are disabled");
            res.body.should.have.property("code","diagnostics.disabled");
            done();
        });
    });

});
