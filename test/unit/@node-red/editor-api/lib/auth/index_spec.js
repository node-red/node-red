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
var when = require("when");
var sinon = require("sinon");

var passport = require("passport");

var NR_TEST_UTILS = require("nr-test-utils");

var auth = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth");
var Users = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/users");
var Tokens = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/tokens");
var Permissions = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/permissions");

describe("api/auth/index",function() {



    describe("ensureClientSecret", function() {
        before(function() {
            auth.init({},{})
        });
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

            var res = { status: function(resp) {
                revokeToken.restore();

                resp.should.equal(200);
                return {
                    end: done
                }
            }};

            auth.revoke(req,res);
        });
    });

    describe("login", function() {
        beforeEach(function() {
            sinon.stub(Tokens,"init",function(){});
            sinon.stub(Users,"init",function(){});
        });
        afterEach(function() {
            Tokens.init.restore();
            Users.init.restore();
        });
        it("returns login details - credentials", function(done) {
            auth.init({adminAuth:{type:"credentials"}},{})
            auth.login(null,{json: function(resp) {
                resp.should.have.a.property("type","credentials");
                resp.should.have.a.property("prompts");
                resp.prompts.should.have.a.lengthOf(2);
                done();
            }});
        });
        it("returns login details - none", function(done) {
            auth.init({},{})
            auth.login(null,{json: function(resp) {
                resp.should.eql({});
                done();
            }});
        });
        it("returns login details - strategy", function(done) {
            auth.init({adminAuth:{type:"strategy",strategy:{label:"test-strategy",icon:"test-icon"}}},{})
            auth.login(null,{json: function(resp) {
                resp.should.have.a.property("type","strategy");
                resp.should.have.a.property("prompts");
                resp.prompts.should.have.a.lengthOf(1);
                resp.prompts[0].should.have.a.property("type","button");
                resp.prompts[0].should.have.a.property("label","test-strategy");
                resp.prompts[0].should.have.a.property("icon","test-icon");

                done();
            }});
        });

    });
    describe("needsPermission", function() {
        beforeEach(function() {
            sinon.stub(Tokens,"init",function(){});
            sinon.stub(Users,"init",function(){});
        });
        afterEach(function() {
            Tokens.init.restore();
            Users.init.restore();
            if (passport.authenticate.restore) {
                passport.authenticate.restore();
            }
            if (Permissions.hasPermission.restore) {
                Permissions.hasPermission.restore();
            }
        });


        it('no-ops if adminAuth not set', function(done) {
            sinon.stub(passport,"authenticate",function(scopes,opts) {
                return function(req,res,next) {
                }
            });
            auth.init({});
            var func = auth.needsPermission("foo");
            func({},{},function() {
                passport.authenticate.called.should.be.false();
                done();
            })
        });
        it('skips auth if req.user undefined', function(done) {
            sinon.stub(passport,"authenticate",function(scopes,opts) {
                return function(req,res,next) {
                    next();
                }
            });
            sinon.stub(Permissions,"hasPermission",function(perm) { return true });
            auth.init({adminAuth:{}});
            var func = auth.needsPermission("foo");
            func({user:null},{},function() {
                try {
                    passport.authenticate.called.should.be.true();
                    Permissions.hasPermission.called.should.be.false();
                    done();
                } catch(err) {
                    done(err);
                }
            })
        });

        it('passes for valid user permission', function(done) {
            sinon.stub(passport,"authenticate",function(scopes,opts) {
                return function(req,res,next) {
                    next();
                }
            });
            sinon.stub(Permissions,"hasPermission",function(perm) { return true });
            auth.init({adminAuth:{}});
            var func = auth.needsPermission("foo");
            func({user:true,authInfo: { scope: "read"}},{},function() {
                try {
                    passport.authenticate.called.should.be.true();
                    Permissions.hasPermission.called.should.be.true();
                    Permissions.hasPermission.lastCall.args[0].should.eql("read");
                    Permissions.hasPermission.lastCall.args[1].should.eql("foo");
                    done();
                } catch(err) {
                    done(err);
                }
            })
        });

        it('rejects for invalid user permission', function(done) {
            sinon.stub(passport,"authenticate",function(scopes,opts) {
                return function(req,res,next) {
                    next();
                }
            });
            sinon.stub(Permissions,"hasPermission",function(perm) { return false });
            auth.init({adminAuth:{}});
            var func = auth.needsPermission("foo");
            func({user:true,authInfo: { scope: "read"}},{
                status: function(status) {
                    return { end: function() {
                        try {
                            status.should.eql(401);
                            done();
                        } catch(err) {
                            done(err);
                        }
                    }}
                }
            },function() {
                done(new Error("hasPermission unexpected passed"))
            });
        });
    });
});
