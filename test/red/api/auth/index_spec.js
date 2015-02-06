/**
 * Copyright 2015 IBM Corp.
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
var when = require("when");
var sinon = require("sinon");

var passport = require("passport");

var auth = require("../../../../red/api/auth");
var Tokens = require("../../../../red/api/auth/tokens");

var settings = require("../../../../red/settings");


describe("api auth middleware",function() {
    
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
    
    describe("revoke", function() {
        it("revokes a token", function(done) {
            var revokeToken = sinon.stub(Tokens,"revoke",function() {
                return when.resolve();
            });
            
            var req = { body: { token: "abcdef" } };
            
            var res = { send: function(resp) {
                revokeToken.restore();

                resp.should.equal(200);
                done();
            }};
            
            auth.revoke(req,res);
        });
    });
    
    describe("login", function() {
        it("returns login details", function(done) {
            auth.login(null,{json: function(resp) {
                resp.should.have.a.property("type","credentials");
                resp.should.have.a.property("prompts");
                resp.prompts.should.have.a.lengthOf(2);
                done();
            }});
        });
            
    });
    
});
