const should = require("should");
const request = require('supertest');
const express = require('express');
const bodyParser = require("body-parser");
const sinon = require('sinon');

let app;

const NR_TEST_UTILS = require("nr-test-utils");
const editorLibs = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/editor-libs");

describe("api/editor/editor-libs", function() {
    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/editor-libs/:name", editorLibs.get);
    });

    it("returns the editor library for mermaid", function(done) {
        const settings = {};
        const runtimeAPI  = {};

        editorLibs.init(settings, runtimeAPI);

        request(app)
        .get("/editor-libs/mermaid")
        .expect(200)
        .end(function(err,res) {
            if (err || (typeof res.error === "object")) {
                return done(err || res.error);
            }
            res.should.have.property("statusCode",200);
            res.should.have.property("_body");
            done();
        });
    });

    it('should error when called with unknown library', function(done) {
        const settings = {};
        const runtimeAPI  = {};

        editorLibs.init(settings, runtimeAPI);

        request(app)
            .get("/editor-libs/unknown")
            .expect(400)
            .end(done);
    });
});
