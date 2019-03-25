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
var when = require('when');
var sinon = require('sinon');

var NR_TEST_UTILS = require("nr-test-utils");

var Users = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/users");

describe("api/auth/users", function() {
    after(function() {
        Users.init({});
    })
    describe('Initalised with a credentials object, no anon',function() {
        before(function() {
            Users.init({
                type:"credentials",
                users:{
                    username:"fred",
                    password:'$2a$08$LpYMefvGZ3MjAfZGzcoyR.1BcfHh4wy4NpbN.cEny5aHnWOqjKOXK',
                    // 'password' -> require('bcryptjs').hashSync('password', 8);
                    permissions:"*"
                }
            });
        });
        describe('#get',function() {
            it('returns known user',function(done) {
                Users.get("fred").then(function(user) {
                    try {
                        user.should.have.a.property("username","fred");
                        user.should.have.a.property("permissions","*");
                        user.should.not.have.a.property("password");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });

            it('returns null for unknown user', function(done) {
                Users.get("barney").then(function(user) {
                    try {
                        should.not.exist(user);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });

        describe('#default',function() {
            it('returns null for default user', function(done) {
                Users.default().then(function(user) {
                    try {
                        should.not.exist(user);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });

        describe('#authenticate',function() {
            it('authenticates a known user', function(done) {
                Users.authenticate('fred','password').then(function(user) {
                    try {
                        user.should.have.a.property("username","fred");
                        user.should.have.a.property("permissions","*");
                        user.should.not.have.a.property("password");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
            it('rejects invalid password for a known user', function(done) {
                Users.authenticate('fred','wrong').then(function(user) {
                    try {
                        should.not.exist(user);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });

            it('rejects invalid user', function(done) {
                Users.authenticate('barney','wrong').then(function(user) {
                    try {
                        should.not.exist(user);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });
    });

    describe('Initalised with a credentials object including anon',function() {
        before(function() {
            Users.init({
                type:"credentials",
                users:[],
                default: { permissions: "*" }
            });
        });
        describe('#default',function() {
            it('returns default user', function(done) {
                Users.default().then(function(user) {
                    try {
                        user.should.have.a.property('anonymous',true);
                        user.should.have.a.property('permissions','*');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });
    });

    describe('Initialised with a credentials object with user functions',function() {
       var authUsername = '';
       var authPassword = '';
       before(function() {
           Users.init({
               type:"credentials",
               users:function(username) {
                   return when.resolve({'username':'dave','permissions':'read'});
               },
               authenticate: function(username,password) {
                   authUsername = username;
                   authPassword = password;
                   return when.resolve({'username':'pete','permissions':'write'});
               }
           });
       });

        describe('#get',function() {
            it('delegates get user',function(done) {
                Users.get('dave').then(function(user) {
                    try {
                        user.should.have.a.property("username","dave");
                        user.should.have.a.property("permissions","read");
                        user.should.not.have.a.property("password");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
            it('delegates authenticate user',function(done) {
                Users.authenticate('pete','secret').then(function(user) {
                    try {
                        user.should.have.a.property("username","pete");
                        user.should.have.a.property("permissions","write");
                        user.should.not.have.a.property("password");
                        authUsername.should.equal('pete');
                        authPassword.should.equal('secret');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });
    });

    describe('Initialised with bad settings to test else cases',function() {
        before(function() {
            Users.init({
                type:"foo",
                users:{
                        username:"fred",
                        password:'$2a$08$LpYMefvGZ3MjAfZGzcoyR.1BcfHh4wy4NpbN.cEny5aHnWOqjKOXK',
                        permissions:"*"
                    }
            });
        });
        describe('#get',function() {
            it('should fail to return user fred',function(done) {
                Users.get("fred").then(function(userf) {
                    try {
                        should.not.exist(userf);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
            });
        });
    });

    describe('Initialised with default set as function',function() {
        before(function() {
            Users.init({
                type:"credentials",
                default: function() { return("Done"); }
            });
        });
        after(function() {
            Users.init({});
        });
        describe('#default',function() {
            it('handles api.default being a function',function(done) {
                Users.should.have.property('default').which.is.a.Function();
                (Users.default()).should.equal("Done");
                done();
            });
        });
    });
});
