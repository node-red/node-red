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
var sinon = require('sinon');

var NR_TEST_UTILS = require("nr-test-utils");

var strategies = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/strategies");
var Users = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/users");
var Tokens = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/tokens");
var Clients = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/clients");

describe("api/auth/strategies", function() {
    describe("Password Token Exchange", function() {
        var userAuthentication;
        afterEach(function() {
            if (userAuthentication) {
                userAuthentication.restore();
                userAuthentication = null;
            }
        });

        it('Handles authentication failure',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate").callsFake(function(username,password) {
                return Promise.resolve(null);
            });

            strategies.passwordTokenExchange({},"user","password","scope",function(err,token) {
                try {
                    should.not.exist(err);
                    token.should.be.false();
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });

        it('Handles scope overreach',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate").callsFake(function(username,password) {
                return Promise.resolve({username:"user",permissions:"read"});
            });

            strategies.passwordTokenExchange({},"user","password","*",function(err,token) {
                try {
                    should.not.exist(err);
                    token.should.be.false();
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });

        it('Creates new token on authentication success',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate").callsFake(function(username,password) {
                return Promise.resolve({username:"user",permissions:"*"});
            });
            var tokenDetails = {};
            var tokenCreate = sinon.stub(Tokens,"create").callsFake(function(username,client,scope) {
                tokenDetails.username = username;
                tokenDetails.client = client;
                tokenDetails.scope = scope;
                return Promise.resolve({accessToken: "123456"});
            });

            strategies.passwordTokenExchange({id:"myclient"},"user","password","read",function(err,token) {
                try {
                    should.not.exist(err);
                    token.should.equal("123456");
                    tokenDetails.should.have.property("username","user");
                    tokenDetails.should.have.property("client","myclient");
                    tokenDetails.should.have.property("scope","read");
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    tokenCreate.restore();
                }
            });
        });

        it('Uses provided token on authentication success and token provided',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate").callsFake(function(username,password) {
                return Promise.resolve({username:"user",permissions:"*",token:"123456"});
            });

            strategies.passwordTokenExchange({id:"myclient"},"user","password","read",function(err,token) {
                try {
                    should.not.exist(err);
                    token.should.equal("123456");
                    done();
                } catch(e) {
                    done(e);
                }
            });
        
        });
    });

    describe("Anonymous Strategy", function() {
        it('Succeeds if anon user enabled',function(done) {
            var userDefault = sinon.stub(Users,"default").callsFake(function() {
                return Promise.resolve("anon");
            });
            strategies.anonymousStrategy._success = strategies.anonymousStrategy.success;
            strategies.anonymousStrategy.success = function(user) {
                user.should.equal("anon");
                strategies.anonymousStrategy.success = strategies.anonymousStrategy._success;
                delete strategies.anonymousStrategy._success;
                done();
            };
            strategies.anonymousStrategy.authenticate({});
        });
        it('Fails if anon user not enabled',function(done) {
            var userDefault = sinon.stub(Users,"default").callsFake(function() {
                return Promise.resolve(null);
            });
            strategies.anonymousStrategy._fail = strategies.anonymousStrategy.fail;
            strategies.anonymousStrategy.fail = function(err) {
                err.should.equal(401);
                strategies.anonymousStrategy.fail = strategies.anonymousStrategy._fail;
                delete strategies.anonymousStrategy._fail;
                done();
            };
            strategies.anonymousStrategy.authenticate({});
        });
        afterEach(function() {
            Users.default.restore();
        })
    });

    describe("Tokens Strategy", function() {
        it('Succeeds if tokens user enabled custom header',function(done) {
            var userTokens = sinon.stub(Users,"tokens").callsFake(function(token) {
                return Promise.resolve("tokens-"+token);
            });
            var userTokenHeader = sinon.stub(Users,"tokenHeader").callsFake(function(token) {
                return "x-test-token";
            });
            strategies.tokensStrategy._success = strategies.tokensStrategy.success;
            strategies.tokensStrategy.success = function(user) {
                user.should.equal("tokens-1234");
                strategies.tokensStrategy.success = strategies.tokensStrategy._success;
                delete strategies.tokensStrategy._success;
                done();
            };
            strategies.tokensStrategy.authenticate({headers:{"x-test-token":"1234"}});
        });
        it('Succeeds if tokens user enabled default header',function(done) {
            var userTokens = sinon.stub(Users,"tokens").callsFake(function(token) {
                return Promise.resolve("tokens-"+token);
            });
            var userTokenHeader = sinon.stub(Users,"tokenHeader").callsFake(function(token) {
                return "authorization";
            });
            strategies.tokensStrategy._success = strategies.tokensStrategy.success;
            strategies.tokensStrategy.success = function(user) {
                user.should.equal("tokens-1234");
                strategies.tokensStrategy.success = strategies.tokensStrategy._success;
                delete strategies.tokensStrategy._success;
                done();
            };
            strategies.tokensStrategy.authenticate({headers:{"authorization":"Bearer 1234"}});
        });
        it('Fails if tokens user not enabled',function(done) {
            var userTokens = sinon.stub(Users,"tokens").callsFake(function() {
                return Promise.resolve(null);
            });
            var userTokenHeader = sinon.stub(Users,"tokenHeader").callsFake(function(token) {
                return "authorization";
            });
            strategies.tokensStrategy._fail = strategies.tokensStrategy.fail;
            strategies.tokensStrategy.fail = function(err) {
                err.should.equal(401);
                strategies.tokensStrategy.fail = strategies.tokensStrategy._fail;
                delete strategies.tokensStrategy._fail;
                done();
            };
            strategies.tokensStrategy.authenticate({headers:{"authorization":"Bearer 1234"}});
        });
        afterEach(function() {
            Users.tokens.restore();
            Users.tokenHeader.restore();
        })
    });

    describe("Bearer Strategy", function() {
        it('Rejects invalid token',function(done) {
            var getToken = sinon.stub(Tokens,"get").callsFake(function(token) {
                return Promise.resolve(null);
            });

            strategies.bearerStrategy("1234",function(err,user) {
                try {
                    should.not.exist(err);
                    user.should.be.false();
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getToken.restore();
                }
            });
        });
        it('Accepts valid token',function(done) {
            var getToken = sinon.stub(Tokens,"get").callsFake(function(token) {
                return Promise.resolve({user:"user",scope:"scope"});
            });
            var getUser = sinon.stub(Users,"get").callsFake(function(username) {
                return Promise.resolve("aUser");
            });

            strategies.bearerStrategy("1234",function(err,user,opts) {
                try {
                    should.not.exist(err);
                    user.should.equal("aUser");
                    opts.should.have.a.property("scope","scope");
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getToken.restore();
                    getUser.restore();
                }
            });
        });
        it('Fail if no user for token',function(done) {
            var getToken = sinon.stub(Tokens,"get").callsFake(function(token) {
                return Promise.resolve({user:"user",scope:"scope"});
            });
            var getUser = sinon.stub(Users,"get").callsFake(function(username) {
                return Promise.resolve(null);
            });

            strategies.bearerStrategy("1234",function(err,user,opts) {
                try {
                    should.not.exist(err);
                    user.should.equal(false);
                    should.not.exist(opts);
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getToken.restore();
                    getUser.restore();
                }
            });
        });
    });

    describe("Client Password Strategy", function() {
        it('Accepts valid client',function(done) {
            var testClient = {id:"node-red-editor",secret:"not_available"};
            var getClient = sinon.stub(Clients,"get").callsFake(function(client) {
                return Promise.resolve(testClient);
            });

            strategies.clientPasswordStrategy(testClient.id,testClient.secret,function(err,client) {
                try {
                    should.not.exist(err);
                    client.should.eql(testClient);
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getClient.restore();
                }
            });
        });
        it('Rejects invalid client secret',function(done) {
            var testClient = {id:"node-red-editor",secret:"not_available"};
            var getClient = sinon.stub(Clients,"get").callsFake(function(client) {
                return Promise.resolve(testClient);
            });

            strategies.clientPasswordStrategy(testClient.id,"invalid_secret",function(err,client) {
                try {
                    should.not.exist(err);
                    client.should.be.false();
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getClient.restore();
                }
            });
        });
        it('Rejects invalid client id',function(done) {
            var getClient = sinon.stub(Clients,"get").callsFake(function(client) {
                return Promise.resolve(null);
            });
            strategies.clientPasswordStrategy("invalid_id","invalid_secret",function(err,client) {
                try {
                    should.not.exist(err);
                    client.should.be.false();
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getClient.restore();
                }
            });
        });

        var userAuthentication;
        it('Blocks after 5 failures',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate").callsFake(function(username,password) {
                return Promise.resolve(null);
            });
            for (var z=0; z<5; z++) {
                strategies.passwordTokenExchange({},"user","badpassword","scope",function(err,token) {
                });
            }
            strategies.passwordTokenExchange({},"user","badpassword","scope",function(err,token) {
                try {
                    err.toString().should.equal("Error: Too many login attempts. Wait 10 minutes and try again");
                    token.should.be.false();
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    userAuthentication.restore();
                }
            });
        });

    });
});
