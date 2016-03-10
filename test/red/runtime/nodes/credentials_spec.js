/**
 * Copyright 2014, 2015 IBM Corp.
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
var when = require("when");
var util = require("util");

var express = require("express");
var request = require("supertest");

var index = require("../../../../red/runtime/nodes/index");
var credentials = require("../../../../red/runtime/nodes/credentials");
var log = require("../../../../red/runtime/log");
var auth = require("../../../../red/api/auth");


describe('Credentials', function() {

    afterEach(function() {
        index.clearRegistry();
    });

    it('loads from storage',function(done) {

        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            }
        };

        credentials.init(storage);

        credentials.load().then(function() {

            credentials.get("a").should.have.property('b',1);
            credentials.get("a").should.have.property('c',2);

            done();
        });
    });

    it('saves to storage', function(done) {
        var storage = {
            saveCredentials: function(creds) {
                return when.resolve("saveCalled");
            }
        };
        credentials.init(storage);
        credentials.save().then(function(res) {
            res.should.equal("saveCalled");
            done();
        });
    });

    it('saves to storage when new cred added', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        sinon.spy(storage,"saveCredentials");
        credentials.init(storage);
        credentials.load().then(function() {
            should.not.exist(credentials.get("b"))
            credentials.add('b',{"d":3});
            storage.saveCredentials.callCount.should.be.exactly(1);
            credentials.get("b").should.have.property('d',3);
            storage.saveCredentials.restore();
            done();
        });
    });

    it('deletes from storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        sinon.spy(storage,"saveCredentials");
        credentials.init(storage);
        credentials.load().then(function() {
            should.exist(credentials.get("a"))
            credentials.delete('a');
            storage.saveCredentials.callCount.should.be.exactly(1);
            should.not.exist(credentials.get("a"));
            storage.saveCredentials.restore();
            done();
        });

    });

    it('clean up from storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        sinon.spy(storage,"saveCredentials");
        credentials.init(storage);
        credentials.load().then(function() {
            should.exist(credentials.get("a"));
            credentials.clean([]);
            storage.saveCredentials.callCount.should.be.exactly(1);
            should.not.exist(credentials.get("a"));
            storage.saveCredentials.restore();
            done();
        });
    });

    it('handle error loading from storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    reject("test forcing failure");
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        var logmsg = 'nothing logged yet';
        sinon.stub(log, 'warn', function(msg) {
            logmsg = msg;
        });

        credentials.init(storage);
        credentials.load().then(function() {
            log.warn.calledOnce.should.be.true;
            log.warn.restore();
            done();
        }).otherwise(function(err){
            log.warn.restore();
            done(err);
        });
    });

    it('credential type is not registered when extract', function(done) {
        var testFlows = [{"type":"test","id":"tab1","label":"Sheet 1"}];
        var storage = {
                getFlows: function() {
                    var defer = when.defer();
                    defer.resolve(testFlows);
                    return defer.promise;
                },
                getCredentials: function() {
                    return when.promise(function(resolve,reject) {
                        resolve({"tab1":{"b":1,"c":2}});
                    });
                },
                saveFlows: function(conf) {
                    var defer = when.defer();
                    defer.resolve();
                    should.deepEqual(testFlows, conf);
                    return defer.promise;
                },
                saveCredentials: function(creds) {
                    return when(true);
                },
                getSettings: function() {
                    return when({});
                },
                saveSettings: function(s) {
                    return when();
                }
        };
        function TestNode(n) {
            index.createNode(this, n);

            this.id = 'tab1';
            this.type = 'test';
            this.name = 'barney';
            var node = this;

            this.on("log", function() {
                // do nothing
            });
        }
        var logmsg = 'nothing logged yet';
        sinon.stub(log, 'warn', function(msg) {
            logmsg = msg;
        });
        var settings = {
            available: function() { return false;}
        }
        index.init({settings:settings, storage:storage});
        index.registerType('test', TestNode);
        index.loadFlows().then(function() {
            var testnode = new TestNode({id:'tab1',type:'test',name:'barney'});
            credentials.extract(testnode);
            log.warn.calledOnce.should.be.true;
            log.warn.restore();
            done();
        }).otherwise(function(err){
            log.warn.restore();
            done(err);
        });
    });

    it('extract and store credential updates in the provided node', function(done) {
        credentials.init({saveCredentials:function(){}},express());
        credentials.register("test",{
            user1:{type:"text"},
            password1:{type:"password"},
            user2:{type:"text"},
            password2:{type:"password"},
            user3:{type:"text"},
            password3:{type:"password"}

        });
        credentials.add("node",{user1:"abc",password1:"123",user2:"def",password2:"456",user3:"ghi",password3:"789"});
        var node = {id:"node",type:"test",credentials:{
            // user1 unchanged
            password1:"__PWRD__",
            user2: "",
            password2:"   ",
            user3:"newUser",
            password3:"newPassword"
        }};
        credentials.extract(node);

        node.should.not.have.a.property("credentials");

        var newCreds = credentials.get("node");
        newCreds.should.have.a.property("user1","abc");
        newCreds.should.have.a.property("password1","123");
        newCreds.should.not.have.a.property("user2");
        newCreds.should.not.have.a.property("password2");
        newCreds.should.have.a.property("user3","newUser");
        newCreds.should.have.a.property("password3","newPassword");

        done();
    });
})
