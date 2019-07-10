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

var editorApi = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor");
var comms = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/comms");
var info = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/settings");
var auth = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth");

var log = NR_TEST_UTILS.require("@node-red/util").log;


var when = require("when");


describe("api/editor/index", function() {
    var app;
    describe("disabled the editor", function() {
        beforeEach(function() {
            sinon.stub(comms,'init', function(){});
            sinon.stub(info,'init', function(){});
        });
        afterEach(function() {
            comms.init.restore();
            info.init.restore();
        });
        it("disables the editor", function() {
            var editorApp = editorApi.init({},{disableEditor:true},{});
            should.not.exist(editorApp);
            comms.init.called.should.be.false();
            info.init.called.should.be.false();
        });
    });
    describe("enables the editor", function() {
        var mockList = [
            'library','theme','locales','credentials','comms',"settings"
        ]
        var isStarted = true;
        var errors = [];
        var session_data = {};
        before(function() {
            sinon.stub(auth,'needsPermission',function(permission) {
                return function(req,res,next) { next(); }
            });
            mockList.forEach(function(m) {
                sinon.stub(NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/"+m),"init",function(){});
            });
            sinon.stub(NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/theme"),"app",function(){ return express()});
        });
        after(function() {
            mockList.forEach(function(m) {
                NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/"+m).init.restore();
            })
            NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/theme").app.restore();
            auth.needsPermission.restore();
            log.error.restore();
        });

        before(function() {
            sinon.stub(log,"error",function(err) { errors.push(err)})
            app = editorApi.init({},{httpNodeRoot:true, httpAdminRoot: true,disableEditor:false,exportNodeSettings:function(){}},{
                isStarted: () => Promise.resolve(isStarted)
            });
        });
        it('serves the editor', function(done) {
            request(app)
            .get("/")
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                // Index page should probably mention Node-RED somewhere
                res.text.indexOf("Node-RED").should.not.eql(-1);
                done();
            });
        });
        it('serves icons', function(done) {
            request(app)
            .get("/red/images/icons/arrow-in.svg")
            .expect(200)
            .expect("Content-Type", /image\/svg\+xml/)
            .end(function(err,res) {
                done(err);
            });
        });
        it('handles page not there', function(done) {
            request(app)
            .get("/foo")
            .expect(404,done)
        });
        it('warns if runtime not started', function(done) {
            isStarted = false;
            request(app)
            .get("/")
            .expect(503)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.text.should.eql("Not started");
                errors.should.have.lengthOf(1);
                errors[0].should.eql("Node-RED runtime not started");
                done();
            });
        });
        // it.skip('GET /settings', function(done) {
        //     request(app).get("/settings").expect(200).end(function(err,res) {
        //         if (err) {
        //             return done(err);
        //         }
        //         // permissionChecks.should.have.property('settings.read',1);
        //         done();
        //     })
        // });
    });
});
