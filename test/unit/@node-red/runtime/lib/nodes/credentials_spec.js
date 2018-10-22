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
var sinon = require("sinon");
var when = require("when");
var util = require("util");

var NR_TEST_UTILS = require("nr-test-utils");
var index = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/index");
var credentials = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/credentials");
var log = NR_TEST_UTILS.require("@node-red/util").log;


describe('red/runtime/nodes/credentials', function() {

    var encryptionDisabledSettings = {
        get: function(key) {
            return false;
        }
    }

    afterEach(function() {
        index.clearRegistry();
    });

    it('loads provided credentials',function(done) {
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });

        credentials.load({"a":{"b":1,"c":2}}).then(function() {

            credentials.get("a").should.have.property('b',1);
            credentials.get("a").should.have.property('c',2);

            done();
        });
    });
    it('adds a new credential',function(done) {
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });
        credentials.load({"a":{"b":1,"c":2}}).then(function() {
            credentials.dirty().should.be.false();
            should.not.exist(credentials.get("b"));
            credentials.add("b",{"foo":"bar"}).then(function() {
                credentials.get("b").should.have.property("foo","bar");
                credentials.dirty().should.be.true();
                done();
            });
        });
    });
    it('deletes an existing credential',function(done) {
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });
        credentials.load({"a":{"b":1,"c":2}}).then(function() {
            credentials.dirty().should.be.false();
            credentials.delete("a");
            should.not.exist(credentials.get("a"));
            credentials.dirty().should.be.true();
            done();
        });
    });

    it('exports the credentials, clearing dirty flag', function(done) {
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });
        var creds = {"a":{"b":1,"c":2}};
        credentials.load(creds).then(function() {
            credentials.add("b",{"foo":"bar"}).then(function() {
                credentials.dirty().should.be.true();
                credentials.export().then(function(exported) {
                    exported.should.eql(creds);
                    credentials.dirty().should.be.false();
                    done();
                })
            });
        });
    })

    describe("#clean",function() {
        it("removes credentials of unknown nodes",function(done) {
            credentials.init({
                log: log,
                settings: encryptionDisabledSettings
            });
            var creds = {"a":{"b":1,"c":2},"b":{"d":3}};
            credentials.load(creds).then(function() {
                credentials.dirty().should.be.false();
                should.exist(credentials.get("a"));
                should.exist(credentials.get("b"));
                credentials.clean([{id:"b"}]).then(function() {
                    credentials.dirty().should.be.true();
                    should.not.exist(credentials.get("a"));
                    should.exist(credentials.get("b"));
                    done();
                });
            });
        });
        it("extracts credentials of known nodes",function(done) {
            credentials.init({
                log: log,
                settings: encryptionDisabledSettings
            });
            credentials.register("testNode",{"b":"text","c":"password"})
            var creds = {"a":{"b":1,"c":2}};
            var newConfig = [{id:"a",type:"testNode",credentials:{"b":"newBValue","c":"newCValue"}}];
            credentials.load(creds).then(function() {
                credentials.dirty().should.be.false();
                credentials.clean(newConfig).then(function() {
                    credentials.dirty().should.be.true();
                    credentials.get("a").should.have.property('b',"newBValue");
                    credentials.get("a").should.have.property('c',"newCValue");
                    should.not.exist(newConfig[0].credentials);
                    done();
                });
            });
        });


    });

    it('warns if a node has no credential definition', function(done) {
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });
        credentials.load({}).then(function() {
            var node = {id:"node",type:"test",credentials:{
                user1:"newUser",
                password1:"newPassword"
            }};
            sinon.spy(log,"warn");
            credentials.extract(node);
            log.warn.called.should.be.true();
            should.not.exist(node.credentials);
            log.warn.restore();
            done();
        });
    })

    it('extract credential updates in the provided node', function(done) {
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });
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
            credentials.dirty().should.be.false();
            credentials.extract(node);

            node.should.not.have.a.property("credentials");

            credentials.dirty().should.be.true();
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
        credentials.init({
            log: log,
            settings: encryptionDisabledSettings
        });
        credentials.load({"node":{user1:"abc",password1:"123"}}).then(function() {
            var node = {id:"node",type:"test"};

            credentials.dirty().should.be.false();
            credentials.extract(node);
            credentials.dirty().should.be.false();
            done();
        });
    });

    describe("encryption",function() {
        var settings = {};
        var runtime = {
            log: log,
            settings: {
                get: function(key) {
                    return settings[key];
                },
                set: function(key,value) {
                    settings[key] = value;
                    return when.resolve();
                },
                delete: function(key) {
                    delete settings[key];
                    return when.resolve();
                }
            }
        }
        it('migrates to encrypted and generates default key', function(done) {
            settings = {};
            credentials.init(runtime);
            credentials.load({"node":{user1:"abc",password1:"123"}}).then(function() {
                settings.should.have.a.property("_credentialSecret");
                settings._credentialSecret.should.have.a.length(64);
                credentials.dirty().should.be.true();
                credentials.export().then(function(result) {
                    result.should.have.a.property("$");
                    // reset everything - but with _credentialSecret still set
                    credentials.init(runtime);
                    // load the freshly encrypted version
                    credentials.load(result).then(function() {
                        should.exist(credentials.get("node"));
                        done();
                    })
                });
            });
        });
        it('uses default key', function(done) {
            settings = {
                _credentialSecret: "e3a36f47f005bf2aaa51ce3fc6fcaafd79da8d03f2b1a9281f8fb0a285e6255a"
            };
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                should.exist(credentials.get("node"));
                credentials.dirty().should.be.false();
                credentials.add("node",{user1:"def",password1:"456"});
                credentials.export().then(function(result) {
                    result.should.have.a.property("$");
                    // reset everything - but with _credentialSecret still set
                    credentials.init(runtime);
                    // load the freshly encrypted version
                    credentials.load(result).then(function() {
                        should.exist(credentials.get("node"));
                        credentials.get("node").should.have.a.property("user1","def");
                        credentials.get("node").should.have.a.property("password1","456");
                        done();
                    })
                });
            });
        });
        it('uses user key', function(done) {
            settings = {
                credentialSecret: "e3a36f47f005bf2aaa51ce3fc6fcaafd79da8d03f2b1a9281f8fb0a285e6255a"
            };
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                credentials.dirty().should.be.false();
                should.exist(credentials.get("node"));
                credentials.add("node",{user1:"def",password1:"456"});
                credentials.export().then(function(result) {
                    result.should.have.a.property("$");

                    // reset everything - but with _credentialSecret still set
                    credentials.init(runtime);
                    // load the freshly encrypted version
                    credentials.load(result).then(function() {
                        should.exist(credentials.get("node"));
                        credentials.get("node").should.have.a.property("user1","def");
                        credentials.get("node").should.have.a.property("password1","456");
                        done();
                    })
                });
            });
        });
        it('uses user key - when settings are otherwise unavailable', function(done) {
            var runtime = {
                log: log,
                settings: {
                    get: function(key) {
                        if (key === 'credentialSecret') {
                            return "e3a36f47f005bf2aaa51ce3fc6fcaafd79da8d03f2b1a9281f8fb0a285e6255a";
                        }
                        throw new Error();
                    },
                    set: function(key,value) {
                        throw new Error();
                    }
                }
            }
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                should.exist(credentials.get("node"));
                credentials.add("node",{user1:"def",password1:"456"});
                credentials.export().then(function(result) {
                    result.should.have.a.property("$");

                    // reset everything - but with _credentialSecret still set
                    credentials.init(runtime);
                    // load the freshly encrypted version
                    credentials.load(result).then(function() {
                        should.exist(credentials.get("node"));
                        credentials.get("node").should.have.a.property("user1","def");
                        credentials.get("node").should.have.a.property("password1","456");
                        done();
                    })
                });
            });
        });
        it('migrates from default key to user key', function(done) {
            settings = {
                _credentialSecret: "e3a36f47f005bf2aaa51ce3fc6fcaafd79da8d03f2b1a9281f8fb0a285e6255a",
                credentialSecret:  "aaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbcccccccccccccddddddddddddeeeee"
            };
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                credentials.dirty().should.be.true();
                should.exist(credentials.get("node"));
                credentials.export().then(function(result) {
                    result.should.have.a.property("$");
                    settings.should.not.have.a.property("_credentialSecret");

                    // reset everything - but with _credentialSecret still set
                    credentials.init(runtime);
                    // load the freshly encrypted version
                    credentials.load(result).then(function() {
                        should.exist(credentials.get("node"));
                        credentials.get("node").should.have.a.property("user1","abc");
                        credentials.get("node").should.have.a.property("password1","123");
                        done();
                    })
                });
            });
        });

        it('migrates from default key to user key - unencrypted original', function(done) {
            settings = {
                _credentialSecret: "e3a36f47f005bf2aaa51ce3fc6fcaafd79da8d03f2b1a9281f8fb0a285e6255a",
                credentialSecret:  "aaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbcccccccccccccddddddddddddeeeee"
            };
            // {"node":{user1:"abc",password1:"123"}}
            var unencryptedFlows = {"node":{user1:"abc",password1:"123"}};
            credentials.init(runtime);
            credentials.load(unencryptedFlows).then(function() {
                credentials.dirty().should.be.true();
                should.exist(credentials.get("node"));
                credentials.export().then(function(result) {
                    result.should.have.a.property("$");
                    settings.should.not.have.a.property("_credentialSecret");

                    // reset everything - but with _credentialSecret still set
                    credentials.init(runtime);
                    // load the freshly encrypted version
                    credentials.load(result).then(function() {
                        should.exist(credentials.get("node"));
                        credentials.get("node").should.have.a.property("user1","abc");
                        credentials.get("node").should.have.a.property("password1","123");
                        done();
                    })
                });
            });
        });

        it('migrates from default key to unencrypted', function(done) {
            settings = {
                _credentialSecret: "e3a36f47f005bf2aaa51ce3fc6fcaafd79da8d03f2b1a9281f8fb0a285e6255a",
                credentialSecret:  false
            };
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                credentials.dirty().should.be.true();
                should.exist(credentials.get("node"));
                credentials.export().then(function(result) {
                    result.should.not.have.a.property("$");
                    settings.should.not.have.a.property("_credentialSecret");
                    result.should.eql({"node":{user1:"abc",password1:"123"}});
                    done();
                });
            });
        });
        it('handles bad default key - resets credentials', function(done) {
            settings = {
                _credentialSecret: "badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb"
            };
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                // credentials.dirty().should.be.true();
                // should.not.exist(credentials.get("node"));
                done();
            }).catch(function(err) {
                err.should.have.property('code','credentials_load_failed');
                done();
            });
        });
        it('handles bad user key - resets credentials', function(done) {
            settings = {
                credentialSecret: "badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb"
            };
            // {"node":{user1:"abc",password1:"123"}}
            var cryptedFlows = {"$":"5b89d8209b5158a3c313675561b1a5b5phN1gDBe81Zv98KqS/hVDmc9EKvaKqRIvcyXYvBlFNzzzJtvN7qfw06i"};
            credentials.init(runtime);
            credentials.load(cryptedFlows).then(function() {
                // credentials.dirty().should.be.true();
                // should.not.exist(credentials.get("node"));
                done();
            }).catch(function(err) {
                err.should.have.property('code','credentials_load_failed');
                done();
            });
        });

        it('handles unavailable settings - leaves creds unencrypted', function(done) {
            var runtime = {
                log: log,
                settings: {
                    get: function(key) {
                        throw new Error();
                    },
                    set: function(key,value) {
                        throw new Error();
                    }
                }
            }
            // {"node":{user1:"abc",password1:"123"}}
            credentials.init(runtime);
            credentials.load({"node":{user1:"abc",password1:"123"}}).then(function() {
                credentials.dirty().should.be.false();
                should.exist(credentials.get("node"));
                credentials.export().then(function(result) {
                    result.should.not.have.a.property("$");
                    result.should.have.a.property("node");
                    done();
                });
            });
        });
    })
})
