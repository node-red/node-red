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
var when = require('when');
var sinon = require('sinon');


var strategies = require("../../../../red/api/auth/strategies");
var Users = require("../../../../red/api/auth/users");
var Tokens = require("../../../../red/api/auth/tokens");
var Clients = require("../../../../red/api/auth/clients");


describe("Auth strategies", function() {
    describe("Password Token Exchange", function() {
        
        var userAuthentication;
        afterEach(function() {
            if (userAuthentication) {
                userAuthentication.restore();
            }
        });
        
        it('Handles authentication failure',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate",function(username,password) {
                return when.resolve(null);
            });
            
            strategies.passwordTokenExchange({},"user","password","scope",function(err,token) {
                try {
                    should.not.exist(err);
                    token.should.be.false;
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });
        
        it('Creates new token on authentication success',function(done) {
            userAuthentication = sinon.stub(Users,"authenticate",function(username,password) {
                return when.resolve({username:"user"});
            });
            var tokenDetails = {};
            var tokenCreate = sinon.stub(Tokens,"create",function(username,client,scope) {
                tokenDetails.username = username;
                tokenDetails.client = client;
                tokenDetails.scope = scope;
                return when.resolve({accessToken: "123456"});
            });
            
            strategies.passwordTokenExchange({id:"myclient"},"user","password","scope",function(err,token) {
                try {
                    should.not.exist(err);
                    token.should.equal("123456");
                    tokenDetails.should.have.property("username","user");
                    tokenDetails.should.have.property("client","myclient");
                    tokenDetails.should.have.property("scope","scope");
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    tokenCreate.restore();
                }
            });
            
        });
    });
    
    describe("Anonymous Strategy", function() {
        it('Succeeds if anon user enabled',function(done) {
            var userDefault = sinon.stub(Users,"default",function() {
                return when.resolve("anon");
            });
            strategies.anonymousStrategy._success = strategies.anonymousStrategy.success;
            strategies.anonymousStrategy.success = function(user) {
                user.should.equal("anon");
                strategies.anonymousStrategy.success = strategies.anonymousStrategy._success;
                delete strategies.anonymousStrategy._success;
                userDefault.restore();
                done();
            };
            strategies.anonymousStrategy.authenticate({});
        });
        it('Fails if anon user not enabled',function(done) {
            var userDefault = sinon.stub(Users,"default",function() {
                return when.resolve(null);
            });
            strategies.anonymousStrategy._fail = strategies.anonymousStrategy.fail;
            strategies.anonymousStrategy.fail = function(err) {
                err.should.equal(401);
                strategies.anonymousStrategy.fail = strategies.anonymousStrategy._fail;
                delete strategies.anonymousStrategy._fail;
                userDefault.restore();
                done();
            };
            strategies.anonymousStrategy.authenticate({});
        });
    });
    
    describe("Bearer Strategy", function() {
        it('Rejects invalid token',function(done) {
            var getToken = sinon.stub(Tokens,"get",function(token) {
                return when.resolve(null);
            });
            
            strategies.bearerStrategy("1234",function(err,user) {
                try {
                    should.not.exist(err);
                    user.should.be.false;
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getToken.restore();
                }
            });
        });
        it('Accepts valid token',function(done) {
            var getToken = sinon.stub(Tokens,"get",function(token) {
                return when.resolve({user:"user",scope:"scope"});
            });
            var getUser = sinon.stub(Users,"get",function(username) {
                return when.resolve("aUser");
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
    });
    
    describe("Client Password Strategy", function() {
        it('Accepts valid client',function(done) {
            var testClient = {id:"node-red-editor",secret:"not_available"};
            var getClient = sinon.stub(Clients,"get",function(client) {
                return when.resolve(testClient);
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
            var getClient = sinon.stub(Clients,"get",function(client) {
                return when.resolve(testClient);
            });
            
            strategies.clientPasswordStrategy(testClient.id,"invalid_secret",function(err,client) {
                try {
                    should.not.exist(err);
                    client.should.be.false;
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getClient.restore();
                }
            });
        });
        it('Rejects invalid client id',function(done) {
            var testClient = {id:"node-red-editor",secret:"not_available"};
            var getClient = sinon.stub(Clients,"get",function(client) {
                return when.resolve(null);
            });
            
            strategies.clientPasswordStrategy("invalid_id","invalid_secret",function(err,client) {
                try {
                    should.not.exist(err);
                    client.should.be.false;
                    done();
                } catch(e) {
                    done(e);
                } finally {
                    getClient.restore();
                }
            });
        });
    });
});
            
