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

var Tokens = require("../../../../red/api/auth/tokens");


describe("Tokens", function() {
    describe("#init",function() {
        it('loads sessions', function(done) {
            Tokens.init({}).then(done);
        });
    });


    describe("#get",function() {
        it('returns a valid token', function(done) {
            Tokens.init({},{
                getSessions:function() {
                    return when.resolve({"1234":{"user":"fred","expires":Date.now()+1000}});
                }
            }).then(function() {
                Tokens.get("1234").then(function(token) {
                    try {
                        token.should.have.a.property("user","fred");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });

        it('returns null for an invalid token', function(done) {
            Tokens.init({},{
                getSessions:function() {
                    return when.resolve({});
                }
            }).then(function() {
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
        it('returns null for an expired token', function(done) {
            var saveSessions = sinon.stub().returns(when.resolve());
            var expiryTime = Date.now()+50;
            Tokens.init({},{
                getSessions:function() {
                    return when.resolve({"1234":{"user":"fred","expires":expiryTime}});
                },
                saveSessions: saveSessions
            }).then(function() {
                Tokens.get("1234").then(function(token) {
                    try {
                        should.exist(token);
                        setTimeout(function() {
                            Tokens.get("1234").then(function(token) {
                                try {
                                    should.not.exist(token);
                                    saveSessions.calledOnce.should.be.true();
                                    done();
                                } catch(err) {
                                    done(err);
                                }
                            });
                        },100);
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });
    });

    describe("#create",function() {
        it('creates a token', function(done) {
            var savedSession;
            Tokens.init({sessionExpiryTime: 10},{
                getSessions:function() {
                    return when.resolve({});
                },
                saveSessions:function(sess) {
                    savedSession = sess;
                    return when.resolve();
                }
            });
            var expectedExpiryTime = Date.now()+10000;


            Tokens.create("user","client","scope").then(function(token) {
                try {
                    should.exist(savedSession);
                    var sessionKeys = Object.keys(savedSession);
                    sessionKeys.should.have.lengthOf(1);

                    token.should.have.a.property('accessToken',sessionKeys[0]);
                    savedSession[sessionKeys[0]].should.have.a.property('user','user');
                    savedSession[sessionKeys[0]].should.have.a.property('client','client');
                    savedSession[sessionKeys[0]].should.have.a.property('scope','scope');
                    savedSession[sessionKeys[0]].should.have.a.property('expires');
                    savedSession[sessionKeys[0]].expires.should.be.within(expectedExpiryTime-200,expectedExpiryTime+200);
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    describe("#revoke", function() {
        it('revokes a token', function(done) {
            var savedSession;
            Tokens.init({},{
                getSessions:function() {
                    return when.resolve({"1234":{"user":"fred","expires":Date.now()+1000}});
                },
                saveSessions:function(sess) {
                    savedSession = sess;
                    return when.resolve();
                }
            }).then(function() {
                Tokens.revoke("1234").then(function() {
                    try {
                        savedSession.should.not.have.a.property("1234");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });
    });

});
