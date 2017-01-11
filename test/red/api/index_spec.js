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

describe("api index", function() {
    var app;

    describe("disables editor", function() {
        before(function() {
            api.init({},{
                settings:{httpNodeRoot:true, httpAdminRoot: true,disableEditor:true},
                events: {on:function(){},removeListener: function(){}},
                log: {info:function(){},_:function(){}},
                nodes: {paletteEditorEnabled: function(){return true}}
            });
            app = api.adminApp;
        });

        it('does not serve the editor', function(done) {
            request(app)
                .get("/")
                .expect(404,done)
        });
        it('does not serve icons', function(done) {
            request(app)
                .get("/icons/default.png")
                .expect(404,done)
        });
        it('serves settings', function(done) {
            request(app)
                .get("/settings")
                .expect(200,done)
        });
    });

    describe("can serve auth", function() {
        var mockList = [
            'ui','nodes','flows','library','info','theme','locales','credentials'
        ]
        before(function() {
            mockList.forEach(function(m) {
                sinon.stub(require("../../../red/api/"+m),"init",function(){});
            });
        });
        after(function() {
            mockList.forEach(function(m) {
                require("../../../red/api/"+m).init.restore();
            })
        });
        before(function() {
            api.init({},{
                settings:{httpNodeRoot:true, httpAdminRoot: true, adminAuth:{type: "credentials",users:[],default:{permissions:"read"}}},
                storage:{getSessions:function(){return when.resolve({})}},
                events:{on:function(){},removeListener:function(){}}
            });
            app = api.adminApp;
        });

        it('it now serves auth', function(done) {
            request(app)
                .get("/auth/login")
                .expect(200)
                .end(function(err,res) {
                    if (err) { return done(err); }
                    res.body.type.should.equal("credentials");
                    done();
                });
        });
    });

    describe("editor warns if runtime not started", function() {
        var mockList = [
            'nodes','flows','library','info','theme','locales','credentials'
        ]
        before(function() {
            mockList.forEach(function(m) {
                sinon.stub(require("../../../red/api/"+m),"init",function(){});
            });
        });
        after(function() {
            mockList.forEach(function(m) {
                require("../../../red/api/"+m).init.restore();
            })
        });

        it('serves the editor', function(done) {
            var errorLog = sinon.spy();
            api.init({},{
                log:{audit:function(){},error:errorLog},
                settings:{httpNodeRoot:true, httpAdminRoot: true,disableEditor:false},
                events:{on:function(){},removeListener:function(){}},
                isStarted: function() { return false; } // <-----
            });
            app = api.adminApp;
            request(app)
                .get("/")
                .expect(503)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.eql("Not started");
                    errorLog.calledOnce.should.be.true();
                    done();
                });
        });

    });

    describe("enables editor", function() {

        var mockList = [
            'nodes','flows','library','info','theme','locales','credentials'
        ]
        before(function() {
            mockList.forEach(function(m) {
                sinon.stub(require("../../../red/api/"+m),"init",function(){});
            });
        });
        after(function() {
            mockList.forEach(function(m) {
                require("../../../red/api/"+m).init.restore();
            })
        });

        before(function() {
            api.init({},{
                log:{audit:function(){}},
                settings:{httpNodeRoot:true, httpAdminRoot: true,disableEditor:false},
                events:{on:function(){},removeListener:function(){}},
                isStarted: function() { return true; }
            });
            app = api.adminApp;
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
        it('serves settings', function(done) {
            request(app)
                .get("/settings")
                .expect(200,done)
        });
        it('handles page not there', function(done) {
            request(app)
                .get("/foo")
                .expect(404,done)
        });
    });
});
