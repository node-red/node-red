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

var NR_TEST_UTILS = require("nr-test-utils");
var settings = NR_TEST_UTILS.require("@node-red/runtime/lib/settings");


describe("runtime/settings", function() {

    afterEach(function() {
        settings.reset();
    });

    it('wraps the user settings as read-only properties', function() {
        var userSettings = {
            a: 123,
            b: "test",
            c: [1,2,3]
        }
        settings.init(userSettings);

        settings.available().should.be.false();

        settings.a.should.equal(123);
        settings.b.should.equal("test");
        settings.c.should.be.an.Array();
        settings.c.should.have.lengthOf(3);

        settings.get("a").should.equal(123);
        settings.get("b").should.equal("test");
        settings.get("c").should.be.an.Array();
        settings.get("c").should.have.lengthOf(3);

        /*jshint immed: false */
        (function() {
            settings.a = 456;
        }).should.throw();

        settings.c.push(5);
        settings.c.should.be.an.Array();
        settings.c.should.have.lengthOf(4);

        /*jshint immed: false */
        (function() {
            settings.set("a",456);
        }).should.throw();

        /*jshint immed: false */
        (function() {
            settings.set("a",456);
        }).should.throw();

        /*jshint immed: false */
        (function() {
            settings.get("unknown");
        }).should.throw();

        /*jshint immed: false */
        (function() {
            settings.set("unknown",456);
        }).should.throw();

    });

    it('loads global settings from storage', function(done) {
        var userSettings = {
            a: 123,
            b: "test",
            c: [1,2,3]
        }
        var savedSettings = null;
        var saveCount = 0;
        var storage = {
            getSettings: function() {
                return Promise.resolve({globalA:789});
            },
            saveSettings: function(settings) {
                saveCount++;
                savedSettings = settings;
                return Promise.resolve();
            }
        }
        settings.init(userSettings);

        settings.available().should.be.false();

        /*jshint immed: false */
        (function() {
            settings.get("unknown");
        }).should.throw();
        settings.load(storage).then(function() {
            settings.available().should.be.true();
            settings.get("globalA").should.equal(789);
            settings.set("globalA","abc").then(function() {
                savedSettings.globalA.should.equal("abc");
                saveCount.should.equal(1);
                settings.set("globalA","abc").then(function() {
                    savedSettings.globalA.should.equal("abc");
                    // setting to existing value should not trigger save
                    saveCount.should.equal(1);
                    done();
                });
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('removes persistent settings when reset', function() {
        var userSettings = {
            a: 123,
            b: "test",
            c: [1,2,3]
        }
        settings.init(userSettings);

        settings.available().should.be.false();

        settings.should.have.property("a",123);
        settings.should.have.property("b","test");
        settings.c.should.be.an.Array();
        settings.c.should.have.lengthOf(3);

        settings.reset();

        settings.should.not.have.property("a");
        settings.should.not.have.property("d");
        settings.should.not.have.property("c");

    });

    it('registers node settings and exports them', function() {
        var userSettings = {};
        settings.init(userSettings);
        settings.registerNodeSettings("inject", {injectColor:{value:"red", exportable:true}, injectSize:{value:"100", exportable:true}} );
        settings.registerNodeSettings("mqtt", {mqttColor:{value:"purple", exportable:false}, mqttSize:{value:"50", exportable:true}} );
        settings.registerNodeSettings("http request", {httpRequest1:{value:"a1", exportable:true}} );
        settings.registerNodeSettings("  http--request<> ", {httpRequest2:{value:"a2", exportable:true}} );
        settings.registerNodeSettings("_http_request_", {httpRequest3:{value:"a3", exportable:true}} );
        settings.registerNodeSettings("mQtT", {mQtTColor:{value:"purple", exportable:true}} );
        settings.registerNodeSettings("abc123", {abc123:{value:"def456", exportable:true}} );
        settings.registerNodeSettings("noValue", {noValueHasValue:{value:"123", exportable:true}, noValueNoValue:{exportable:true}} );

        var safeSettings = {};
        settings.exportNodeSettings(safeSettings);
        safeSettings.should.have.property("injectColor", "red");
        safeSettings.should.have.property("injectSize", "100");
        safeSettings.should.not.have.property("mqttColor");
        safeSettings.should.have.property("mqttSize", "50");
        safeSettings.should.have.property("httpRequest1", "a1");
        safeSettings.should.have.property("httpRequest2", "a2");
        safeSettings.should.have.property("httpRequest3", "a3");
        safeSettings.should.have.property("mQtTColor", "purple");
        safeSettings.should.have.property("abc123", "def456");

        safeSettings.should.have.property("noValueHasValue", "123");
        safeSettings.should.not.have.property("noValueNoValue");
    });

    it('prohibits registering the property whose name do not start with type name', function() {
        var userSettings = {};
        settings.init(userSettings);
        (function() {
            settings.registerNodeSettings("inject", {color:{value:"red", exportable:true}} );
        }).should.throw();
        (function() {
            settings.registerNodeSettings("_a_b_1_", {ab1Color:{value:"red", exportable:true}} );
        }).should.throw();
        (function() {
            settings.registerNodeSettings("AB2", {AB2Color:{value:"red", exportable:true}} );
        }).should.throw();
        (function() {
            settings.registerNodeSettings("abcDef", {abcColor:{value:"red", exportable:true}} );
        }).should.throw();
        var safeSettings = {};
        settings.exportNodeSettings(safeSettings);
        safeSettings.should.not.have.property("color");
        safeSettings.should.not.have.property("ab1Color", "blue");
        safeSettings.should.not.have.property("AB2Color");
        safeSettings.should.not.have.property("abcColor");
    });

    it('overwrites node settings with user settings', function() {
        var userSettings = {
            injectColor: "green",
            mqttColor: "yellow",
            abColor: [1,2,3]
        }
        settings.init(userSettings);
        settings.registerNodeSettings("inject", {injectColor:{value:"red", exportable:true}} );
        settings.registerNodeSettings("ab", {abColor:{value:"red", exportable:false}} );
        var safeSettings = {};
        settings.exportNodeSettings(safeSettings);
        safeSettings.should.have.property("injectColor", "green");
        safeSettings.should.not.have.property("mqttColor");
        safeSettings.should.not.have.property("abColor");
    });

    it('disables/enables node settings', function() {
        var userSettings = {};
        settings.init(userSettings);

        var safeSettings = {};
        settings.registerNodeSettings("inject", {injectColor:{value:"red", exportable:true}} );
        settings.registerNodeSettings("mqtt", {mqttColor:{value:"purple", exportable:true}} );
        settings.registerNodeSettings("http request", {httpRequestColor:{value:"yellow", exportable:true}} );
        settings.exportNodeSettings(safeSettings);
        safeSettings.should.have.property("injectColor", "red");
        safeSettings.should.have.property("mqttColor", "purple");
        safeSettings.should.have.property("httpRequestColor", "yellow");

        safeSettings = {};
        var types = ["inject", "mqtt"];
        settings.disableNodeSettings(types);
        settings.exportNodeSettings(safeSettings);
        safeSettings.should.not.have.property("injectColor");
        safeSettings.should.not.have.property("mqttColor");
        safeSettings.should.have.property("httpRequestColor", "yellow");

        safeSettings = {};
        types = ["inject"];
        settings.enableNodeSettings(types);
        settings.exportNodeSettings(safeSettings);
        safeSettings.should.have.property("injectColor", "red");
        safeSettings.should.not.have.property("mqttColor");
        safeSettings.should.have.property("httpRequestColor", "yellow");
    });


    it('delete global setting', function() {
        // read-only
        var localSettings = {a:1};
        // read-write
        var globalSettings = {b:2};
        var storage = {
            getSettings: function() {
                return Promise.resolve(globalSettings);
            },
            saveSettings: function() {
                return Promise.resolve();
            }
        }
        settings.init(localSettings);
        return settings.load(storage).then(function() {
            settings.get('a').should.eql(1);
            settings.get('b').should.eql(2);
            return settings.delete('b')
        }).then(function() {
            should.not.exist(settings.get('b'));
        })
    });

    it('refused to delete local setting', function(done) {
        // read-only
        var localSettings = {a:1};
        // read-write
        var globalSettings = {b:2};
        var storage = {
            getSettings: function() {
                return Promise.resolve(globalSettings);
            }
        }
        settings.init(localSettings);
        settings.load(storage).then(function() {
            settings.get('a').should.eql(1);
            settings.get('b').should.eql(2);
            try {
                settings.delete('a');
                return done("Did not throw error");
            } catch(err) {
                // expected
            }
            done();
        }).catch(done)
    });


    it('get user settings', function() {
        var userSettings = {
            admin: {a:1}
        }
        var storage = {
            getSettings: function() {
                return Promise.resolve({a:1,users:userSettings});
            }
        }
        settings.init(userSettings);
        return settings.load(storage).then(function() {
            var result = settings.getUserSettings('admin');
            result.should.eql(userSettings.admin);
            // Check it has been cloned
            result.should.not.equal(userSettings.admin);
        })
    })
    it('set user settings', function() {
        var userSettings = {
            admin: {a:1}
        }
        var savedSettings;
        var storage = {
            getSettings: function() {
                return Promise.resolve({c:3,users:userSettings});
            },
            saveSettings: function(s) {
                savedSettings = s;
                return Promise.resolve();
            }
        }
        settings.init(userSettings);
        return settings.load(storage).then(function() {
            return settings.setUserSettings('admin',{b:2})
        }).then(function() {
            savedSettings.should.have.property("c",3);
            savedSettings.should.have.property('users');
            savedSettings.users.should.eql({admin:{b:2}})
        })
    })

});
