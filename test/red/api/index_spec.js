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
var api = require("../../../red/api");

var apiUtil = require("../../../red/api/util");
var apiAuth = require("../../../red/api/auth");
var apiEditor = require("../../../red/api/editor");
var apiAdmin = require("../../../red/api/admin");


describe("api/index", function() {
    var beforeEach = function() {
        sinon.stub(apiUtil,"init",function(){});
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
        apiUtil.init.restore();
        apiAuth.init.restore();
        apiAuth.login.restore();
        apiEditor.init.restore();
        apiAdmin.init.restore();
    };

    beforeEach(beforeEach);
    afterEach(afterEach);

    it("does not setup admin api if httpAdminRoot is false", function(done) {
        api.init({},{
            settings: { httpAdminRoot: false }
        });
        should.not.exist(api.adminApp);
        done();
    });
    describe('initalises admin api without adminAuth', function(done) {
        before(function() {
            beforeEach();
            api.init({},{
                settings: { }
            });
        });
        after(afterEach);
        it('exposes the editor',function(done) {
            request(api.adminApp).get("/editor").expect(200).end(done);
        })
        it('exposes the admin api',function(done) {
            request(api.adminApp).get("/admin").expect(200).end(done);
        })
        it('exposes the auth api',function(done) {
            request(api.adminApp).get("/auth/login").expect(200).end(done);
        })
    });

    describe('initalises admin api without editor', function(done) {
        before(function() {
            beforeEach();
            api.init({},{
                settings: { disableEditor: true }
            });
        });
        after(afterEach);
        it('does not expose the editor',function(done) {
            request(api.adminApp).get("/editor").expect(404).end(done);
        })
        it('exposes the admin api',function(done) {
            request(api.adminApp).get("/admin").expect(200).end(done);
        })
        it('exposes the auth api',function(done) {
            request(api.adminApp).get("/auth/login").expect(200).end(done)
        })
    });
});
