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
var when = require("when");
var fs = require("fs");
var path = require("path");

var NR_TEST_UTILS = require("nr-test-utils");

var api = NR_TEST_UTILS.require("@node-red/editor-api");

var apiAuth = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth");
var apiEditor = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor");
var apiAdmin = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin");


describe("api/index", function() {
    var beforeEach = function() {
        sinon.stub(apiAuth,"init",function(){});
        sinon.stub(apiEditor,"init",function(){
            var app = express();
            app.get("/editor",function(req,res) { res.status(200).end(); });
            return app;
        });
        sinon.stub(apiAdmin,"init",function(){
            var app = express();
            app.get("/admin",function(req,res) { res.status(200).end(); });
            return app;
        });
        sinon.stub(apiAuth,"login",function(req,res){
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
    describe('initalises admin api without adminAuth', function(done) {
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

    describe('initalises admin api without editor', function(done) {
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
});
