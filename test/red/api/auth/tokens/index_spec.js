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


var Tokens = require("../../../../../red/api/auth/tokens");


describe("Tokens", function() {
    describe("#init",function() {
        var module = require("module");
        var originalLoader;
        beforeEach(function() {
            originalLoader = module._load;
        });
        afterEach(function() {
            module._load = originalLoader;
        });
        
        it('loads default storage plugin', function(done) {
            module._load = function(name) {
                name.should.equal("./localfilesystem");
                return {init: function(settings) {done()}};
            }
            try {
                Tokens.init({});
            } catch(err) {
                done(err);
            }
        });
        it('loads the specified storage plugin', function(done) {
            module._load = function(name) {
                name.should.equal("./aTestExample");
                return {init: function(settings) {done()}};
            }
            try {
                Tokens.init({sessionStorageModule:"aTestExample"});
            } catch(err) {
                done(err);
            }
        });
        
        it('uses the provided storage plugin', function(done) {
            Tokens.init({sessionStorageModule:{init:function(settings){done()}}});
        });
    });
    
    
    describe("#get",function() {
        it('returns a valid token', function(done) {
            Tokens.init({sessionStorageModule:{
                init:function(settings){},
                get: function(token) {
                    return when.resolve({user:"fred"});
                }
            }});
            
            Tokens.get("1234").then(function(token) {
                try {
                    token.should.have.a.property("user","fred");
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
        
        it('returns null for an invalid token', function(done) {
            Tokens.init({sessionStorageModule:{
                init:function(settings){},
                get: function(token) {
                    return when.resolve(null);
                }
            }});
            
            Tokens.get("1234").then(function(token) {
                try {
                    should.not.exist(token);
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });
    
    describe("#create",function() {
        it('creates a token', function(done) {
            var sessionStorageModule = {
                init:function(settings){},
                create: sinon.stub().returns(when.resolve())
            };
            Tokens.init({sessionStorageModule:sessionStorageModule});
            Tokens.create("user","client","scope").then(function(token) {
                try {
                    sessionStorageModule.create.called.should.be.true;
                    token.should.have.a.property('accessToken',sessionStorageModule.create.args[0][0]);
                    sessionStorageModule.create.args[0][1].should.have.a.property('user','user');
                    sessionStorageModule.create.args[0][1].should.have.a.property('client','client');
                    sessionStorageModule.create.args[0][1].should.have.a.property('scope','scope');
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });
    
    describe("#revoke", function() {
        it('revokes a token', function(done) {
            var deletedToken;
            Tokens.init({sessionStorageModule:{
                init:function(settings){},
                delete: function(token) {
                    deletedToken = token;
                    return when.resolve(null);
                }
            }});
            
            Tokens.revoke("1234").then(function() {
                try {
                    deletedToken.should.equal("1234");
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });
    
});