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

var permissions = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth/permissions");

describe("api/auth/permissions", function() {
    describe("hasPermission", function() {
        it('a user with no permissions',function() {
            permissions.hasPermission([],"*").should.be.false();
        });
        it('a user with global permissions',function() {
            permissions.hasPermission("*","read").should.be.true();
            permissions.hasPermission(["*"],"write").should.be.true();
        });
        it('a user with read permissions',function() {
            permissions.hasPermission(["read"],"read").should.be.true();
            permissions.hasPermission(["read"],"node.read").should.be.true();
            permissions.hasPermission(["read"],"write").should.be.false();
            permissions.hasPermission(["read"],"node.write").should.be.false();
            permissions.hasPermission(["*.read"],"read").should.be.true();
            permissions.hasPermission(["*.read"],"node.read").should.be.true();
            permissions.hasPermission(["*.read"],"write").should.be.false();
            permissions.hasPermission(["*.read"],"node.write").should.be.false();
        });
        it('a user with foo permissions',function() {
            permissions.hasPermission("foo","foo").should.be.true();
        });
        it('an array of permissions', function() {
            permissions.hasPermission(["*"],["foo.read","foo.write"]).should.be.true();
            permissions.hasPermission("read",["foo.read","foo.write"]).should.be.false();
            permissions.hasPermission("read",["foo.read","bar.read"]).should.be.true();
            permissions.hasPermission(["flows.read"],["flows.read"]).should.be.true();
            permissions.hasPermission(["flows.read"],["flows.write"]).should.be.false();
            permissions.hasPermission(["flows.read","nodes.write"],["flows.write"]).should.be.false();
            permissions.hasPermission(["flows.read","nodes.write"],["nodes.write"]).should.be.true();
        });
        it('permits an empty permission', function() {
            permissions.hasPermission("*","").should.be.true();
            permissions.hasPermission("read",[""]).should.be.true();
        });
    });
});
