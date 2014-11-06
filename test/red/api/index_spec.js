/**
 * Copyright 2014 IBM Corp.
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
var request = require("supertest");
var express = require("express");
var fs = require("fs");
var path = require("path");

var settings = require("../../../red/settings");
var api = require("../../../red/api");


describe("api index", function() {
    var app;
    
    describe("disables editor", function() {
        before(function() {
            settings.init({disableEditor:true});
            app = express();
            api.init(app);
        });
        after(function() {
            settings.reset();
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
    
    describe("enables editor", function() {
        before(function() {
            settings.init({disableEditor:false});
            app = express();
            api.init(app);
        });
        after(function() {
            settings.reset();
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
    });
});