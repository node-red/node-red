/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var should = require("should");
var sinon = require("sinon");
var request = require("supertest");
var express = require("express");

var NR_TEST_UTILS = require("nr-test-utils");
const auth = require("basic-auth");

var api = NR_TEST_UTILS.require("@node-red/editor-api");

var apiAuth = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth");
var apiEditor = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor");
var apiAdmin = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin");


describe("api/index", function() {
    var beforeEach = function() {
        sinon.stub(apiAuth,"init").callsFake(function(){});
        sinon.stub(apiEditor,"init").callsFake(function(){
            var app = express();
            app.get("/editor",function(req,res) { res.status(200).end(); });
            return app;
        });
        sinon.stub(apiAdmin,"init").callsFake(function(){
            var app = express();
            app.get("/admin",function(req,res) { res.status(200).end(); });
            return app;
        });
        sinon.stub(apiAuth,"login").callsFake(function(req,res){
            res.status(200).end();
        });
    };
    var afterEach = function() {
        apiAuth.init.restore();
        apiAuth.login.restore();
        apiEditor.init.restore();
        apiAdmin.init.restore();
    };

    beforeEach(beforeEach);
    afterEach(afterEach);

    it("does not setup admin api if httpAdminRoot is false", function(done) {
        api.init({ httpAdminRoot: false },{},{},{});
        should.not.exist(api.httpAdmin);
        done();
    });
    describe('initalises admin api without adminAuth', function() {
        before(function() {
            beforeEach();
            api.init({},{},{},{});
        });
        after(afterEach);
        it('exposes the editor',function(done) {
            request(api.httpAdmin).get("/editor").expect(200).end(done);
        })
        it('exposes the admin api',function(done) {
            request(api.httpAdmin).get("/admin").expect(200).end(done);
        })
        it('exposes the auth api',function(done) {
            request(api.httpAdmin).get("/auth/login").expect(200).end(done);
        })
    });

    describe('initalises admin api without editor', function() {
        before(function() {
            beforeEach();
            api.init({ disableEditor: true },{},{},{});
        });
        after(afterEach);
        it('does not expose the editor',function(done) {
            request(api.httpAdmin).get("/editor").expect(404).end(done);
        })
        it('exposes the admin api',function(done) {
            request(api.httpAdmin).get("/admin").expect(200).end(done);
        })
        it('exposes the auth api',function(done) {
            request(api.httpAdmin).get("/auth/login").expect(200).end(done)
        })
    });

    describe('initialises api with admin middleware', function() {
        it('ignores non-function values',function(done) {
            api.init({ httpAdminRoot: true, httpAdminMiddleware: undefined },{},{},{});
            const middlewareFound = api.httpAdmin._router.stack.filter((layer) => layer.name === 'testMiddleware')
            should(middlewareFound).be.empty();
            done();
        });

        it('only accepts functions as middleware',function(done) {
            const testMiddleware = function(req, res, next){ next(); };
            api.init({ httpAdminRoot: true, httpAdminMiddleware: testMiddleware },{},{},{});
            const middlewareFound = api.httpAdmin._router.stack.filter((layer) => layer.name === 'testMiddleware')
            should(middlewareFound).be.length(1);
            done();
        });
    });

    describe('initialises api with authentication enabled', function() {

        it('enables an oauth/openID based authentication mechanism',function(done) {
            const stub = sinon.stub(apiAuth, 'genericStrategy').callsFake(function(){});
            const adminAuth = { type: 'strategy', strategy: {} }
            api.init({ httpAdminRoot: true, adminAuth },{},{},{});
            should(stub.called).be.ok();
            stub.restore();
            done();
        });

        it('enables password protection',function(done) {
            const adminAuth = { type: 'credentials' }
            api.init({ httpAdminRoot: true, adminAuth },{},{},{});
            
            // is the name ("initialize") of the passport middleware present
            const middlewareFound = api.httpAdmin._router.stack.filter((layer) => layer.name === 'initialize')
            should(middlewareFound).be.length(1);
            done();
        });

    });

    describe('initialises api with custom cors config', function () {
        const httpAdminCors = {
            origin: "*",
            methods: "GET,PUT,POST,DELETE"
        };

        it('uses default cors middleware when user settings absent', function(done){
            api.init({ httpAdminRoot: true }, {}, {}, {});
            const middlewareFound = api.httpAdmin._router.stack.filter((layer) => layer.name === 'corsMiddleware')
            should(middlewareFound).be.length(1);
            done();
        })

        it('enables custom cors middleware when settings present', function(done){
            api.init({ httpAdminRoot: true, httpAdminCors }, {}, {}, {});
            const middlewareFound = api.httpAdmin._router.stack.filter((layer) => layer.name === 'corsMiddleware')
            should(middlewareFound).be.length(2);
            done();
        })
    });

    describe('editor start', function () {

        it('cannot be started when editor is disabled', function (done) {
            const stub = sinon.stub(apiEditor, 'start').callsFake(function () {
                return Promise.resolve(true);
            });
            api.init({ httpAdminRoot: true, disableEditor: true }, {}, {}, {});
            should(api.start()).resolvedWith(true);
            stub.restore();
            done();
        });

        it('can be started when editor enabled', function (done) {
            const stub = sinon.stub(apiEditor, 'start');
            api.init({ httpAdminRoot: true, disableEditor: false }, {}, {}, {});
            api.start();
            should(stub.called).be.true();
            stub.restore();
            done();
        });

    });

});
