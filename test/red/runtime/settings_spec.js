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

var settings = require("../../../red/runtime/settings");


describe("red/settings", function() {

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
                return when.resolve({globalA:789});
            },
            saveSettings: function(settings) {
                saveCount++;
                savedSettings = settings;
                return when.resolve();
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
        }).otherwise(function(err) {
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
});
