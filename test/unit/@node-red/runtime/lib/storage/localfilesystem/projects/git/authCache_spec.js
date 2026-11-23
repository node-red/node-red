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

var NR_TEST_UTILS = require("nr-test-utils");
var authCache = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/projects/git/authCache")

describe("localfilesystem/projects/git/authCache", function() {

    beforeEach(function() {
        authCache.init();
    });
    afterEach(function() {
        authCache.init();
    });

    it('does not modify Object.prototype with unsafe keys', function() {
        try {
            authCache.set("project","__proto__","user1",{password:"secret1"});
            authCache.set("__proto__","remote1","user1",{password:"secret2"});
            authCache.set("project","remote1","__proto__",{password:"secret3"});
            should.not.exist({}.user1);
            should.not.exist({}.remote1);
            should.not.exist({}.password);
            authCache.get("project","__proto__","user1").should.have.property("password","secret1");
            authCache.get("__proto__","remote1","user1").should.have.property("password","secret2");
            authCache.get("project","remote1","__proto__").should.have.property("password","secret3");
            should.not.exist(authCache.get("project","constructor","user1"));
            authCache.clear("project","__proto__");
            should.not.exist(authCache.get("project","__proto__","user1"));
        } finally {
            delete Object.prototype.user1;
            delete Object.prototype.remote1;
            delete Object.prototype.password;
        }
    });

    it('sets/clears auth details for a given project/remote/user', function() {
        should.not.exist(authCache.get("project","remote1","user1"));
        should.not.exist(authCache.get("project","remote1","user2"));

        authCache.set("project","remote1","user1",{foo1:"bar1"});
        authCache.set("project","remote1","user2",{foo2:"bar2"});

        var result = authCache.get("project","remote1","user1");
        result.should.have.property("foo1","bar1");

        result = authCache.get("project","remote1","user2");
        result.should.have.property("foo2","bar2");

        authCache.clear("project","remote1","user1");
        should.not.exist(authCache.get("project","remote1","user1"));
        should.exist(authCache.get("project","remote1","user2"));

    });


    it('clears auth details for all users on a given project/remote', function() {

        authCache.set("project","remote1","user1",{foo1:"bar1"});
        authCache.set("project","remote1","user2",{foo2:"bar2"});
        authCache.set("project","remote2","user1",{foo3:"bar3"});

        should.exist(authCache.get("project","remote1","user1"));
        should.exist(authCache.get("project","remote1","user2"));
        should.exist(authCache.get("project","remote2","user1"));

        authCache.clear("project","remote1");
        should.not.exist(authCache.get("project","remote1","user1"));
        should.not.exist(authCache.get("project","remote1","user2"));
        should.exist(authCache.get("project","remote2","user1"));
    });

    it('clears auth details for all remotes/users on a given project', function() {

        authCache.set("project1","remote1","user1",{foo1:"bar1"});
        authCache.set("project1","remote1","user2",{foo2:"bar2"});
        authCache.set("project2","remote2","user1",{foo3:"bar3"});

        should.exist(authCache.get("project1","remote1","user1"));
        should.exist(authCache.get("project1","remote1","user2"));
        should.exist(authCache.get("project2","remote2","user1"));

        authCache.clear("project2");
        should.exist(authCache.get("project1","remote1","user1"));
        should.exist(authCache.get("project1","remote1","user2"));
        should.not.exist(authCache.get("project2","remote2","user1"));
    });

});
