/**
 * Copyright 2014, 2016 IBM Corp.
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

var index = require("../../../../red/runtime/nodes/index");
var credentials = require("../../../../red/runtime/nodes/credentials");
var log = require("../../../../red/runtime/log");


describe('red/runtime/nodes/credentials', function() {

    afterEach(function() {
        index.clearRegistry();
    });

    it('loads provided credentials',function(done) {
        credentials.init();

        credentials.load({"a":{"b":1,"c":2}}).then(function() {

            credentials.get("a").should.have.property('b',1);
            credentials.get("a").should.have.property('c',2);

            done();
        });
    });
    it('adds a new credential',function(done) {
        credentials.init();
        credentials.load({"a":{"b":1,"c":2}}).then(function() {
            credentials.dirty().should.be.false;
            should.not.exist(credentials.get("b"));
            credentials.add("b",{"foo":"bar"}).then(function() {
                credentials.get("b").should.have.property("foo","bar");
                credentials.dirty().should.be.true;
                done();
            });
        });
    });
    it('deletes an existing credential',function(done) {
        credentials.init();
        credentials.load({"a":{"b":1,"c":2}}).then(function() {
            credentials.dirty().should.be.false;
            credentials.delete("a");
            should.not.exist(credentials.get("a"));
            credentials.dirty().should.be.true;
            done();
        });
    });

    it('exports the credentials, clearing dirty flag', function(done) {
        credentials.init();
        var creds = {"a":{"b":1,"c":2}};
        credentials.load(creds).then(function() {
            credentials.add("b",{"foo":"bar"}).then(function() {
                credentials.dirty().should.be.true;
                credentials.export().then(function(exported) {
                    exported.should.eql(creds);
                    credentials.dirty().should.be.false;
                    done();
                })
            });
        });
    })

    describe("#clean",function() {
        it("removes credentials of unknown nodes",function(done) {
            credentials.init();
            var creds = {"a":{"b":1,"c":2},"b":{"d":3}};
            credentials.load(creds).then(function() {
                credentials.dirty().should.be.false;
                should.exist(credentials.get("a"));
                should.exist(credentials.get("b"));
                credentials.clean([{id:"b"}]).then(function() {
                    credentials.dirty().should.be.true;
                    should.not.exist(credentials.get("a"));
                    should.exist(credentials.get("b"));
                    done();
                });
            });
        });
        it("extracts credentials of known nodes",function(done) {
            credentials.init();
            credentials.register("testNode",{"b":"text","c":"password"})
            var creds = {"a":{"b":1,"c":2}};
            var newConfig = [{id:"a",type:"testNode",credentials:{"b":"newBValue","c":"newCValue"}}];
            credentials.load(creds).then(function() {
                credentials.dirty().should.be.false;
                credentials.clean(newConfig).then(function() {
                    credentials.dirty().should.be.true;
                    credentials.get("a").should.have.property('b',"newBValue");
                    credentials.get("a").should.have.property('c',"newCValue");
                    should.not.exist(newConfig[0].credentials);
                    done();
                });
            });
        });


    });

    it('warns if a node has no credential definition', function(done) {
        credentials.init();
        credentials.load({}).then(function() {
            var node = {id:"node",type:"test",credentials:{
                user1:"newUser",
                password1:"newPassword"
            }};
            sinon.spy(log,"warn");
            credentials.extract(node);
            log.warn.called.should.be.true;
            should.not.exist(node.credentials);
            log.warn.restore();
            done();
        });
    })

    it('extract credential updates in the provided node', function(done) {
        credentials.init();
        var defintion = {
            user1:{type:"text"},
            password1:{type:"password"},
            user2:{type:"text"},
            password2:{type:"password"},
            user3:{type:"text"},
            password3:{type:"password"}

        };
        credentials.register("test",defintion);
        var def = credentials.getDefinition("test");
        defintion.should.eql(def);

        credentials.load({"node":{user1:"abc",password1:"123",user2:"def",password2:"456",user3:"ghi",password3:"789"}}).then(function() {
            var node = {id:"node",type:"test",credentials:{
                // user1 unchanged
                password1:"__PWRD__",
                user2: "",
                password2:"   ",
                user3:"newUser",
                password3:"newPassword"
            }};
            credentials.dirty().should.be.false;
            credentials.extract(node);

            node.should.not.have.a.property("credentials");

            credentials.dirty().should.be.true;
            var newCreds = credentials.get("node");
            newCreds.should.have.a.property("user1","abc");
            newCreds.should.have.a.property("password1","123");
            newCreds.should.not.have.a.property("user2");
            newCreds.should.not.have.a.property("password2");
            newCreds.should.have.a.property("user3","newUser");
            newCreds.should.have.a.property("password3","newPassword");

            done();
        });
    });
    it('extract ignores node without credentials', function(done) {
        credentials.init();
        credentials.load({"node":{user1:"abc",password1:"123"}}).then(function() {
            var node = {id:"node",type:"test"};

            credentials.dirty().should.be.false;
            credentials.extract(node);
            credentials.dirty().should.be.false;
            done();
        });
    });
})
