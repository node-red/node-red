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
var editorApi = require("../../../../red/api/editor");
var comms = require("../../../../red/api/editor/comms");
var info = require("../../../../red/api/editor/settings");
var auth = require("../../../../red/api/auth");
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
            var editorApp = editorApi.init({},{
                settings:{disableEditor:true}
            });
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
                sinon.stub(require("../../../../red/api/editor/"+m),"init",function(){});
            });
            sinon.stub(require("../../../../red/api/editor/theme"),"app",function(){ return express()});
        });
        after(function() {
            mockList.forEach(function(m) {
                require("../../../../red/api/editor/"+m).init.restore();
            })
            require("../../../../red/api/editor/theme").app.restore();
            auth.needsPermission.restore();
        });

        before(function() {
            app = editorApi.init({},{
                log:{audit:function(){},error:function(msg){errors.push(msg)}},
                settings:{httpNodeRoot:true, httpAdminRoot: true,disableEditor:false,exportNodeSettings:function(){}},
                events:{on:function(){},removeListener:function(){}},
                isStarted: function() { return isStarted; },
                nodes: {paletteEditorEnabled: function() { return false }}
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
            .get("/icons/inject.png")
            .expect("Content-Type", /image\/png/)
            .expect(200,done)
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
        // it('GET /settings', function(done) {
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
