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
var sinon = require("sinon");
var request = require('supertest');
var express = require('express');

var passport = require("passport");

var auth = require("../../../../red/api/auth");

var settings = require("../../../../red/settings");


describe("api auth middleware",function() {
    describe("authenticate",function() {
        it("does not trigger on auth paths", sinon.test(function(done) {
            this.stub(passport,"authenticate",function() {
                return function() {
                    settings.reset();
                    done(new Error("authentication not applied to auth path"));
                }
            });
            settings.init({httpAdminAuth:{}});
            var req = {
                originalUrl: "/auth/token"
            };
            auth.authenticate(req,null,function() {
                settings.reset();
                done();
            });
             
        }));
        it("does trigger on non-auth paths", sinon.test(function(done) {
            this.stub(passport,"authenticate",function() {
                return function() {
                    settings.reset();
                    done();
                }
            });
            settings.init({httpAdminAuth:{}});
            var req = {
                originalUrl: "/"
            };
            auth.authenticate(req,null,function() {
                settings.reset();
                done(new Error("authentication applied to non-auth path"));
            });
             
        }));
        it("does not trigger on non-auth paths with auth disabled", sinon.test(function(done) {
            this.stub(passport,"authenticate",function() {
                return function() {
                    settings.reset();
                    done(new Error("authentication applied when disabled"));
                }
            });
            settings.init({});
            var req = {
                originalUrl: "/"
            };
            auth.authenticate(req,null,function() {
                settings.reset();
                done();
            });
             
        }));
    });
    
    describe("ensureClientSecret", function() {
        it("leaves client_secret alone if not present",function(done) {
            var req = {
                body: {
                    client_secret: "test_value"
                }
            };
            auth.ensureClientSecret(req,null,function() {
                req.body.should.have.a.property("client_secret","test_value");
                done();
            })
        });
        it("applies a default client_secret if not present",function(done) {
            var req = {
                body: { }
            };
            auth.ensureClientSecret(req,null,function() {
                req.body.should.have.a.property("client_secret","not_available");
                done();
            })
        });
    });
});
