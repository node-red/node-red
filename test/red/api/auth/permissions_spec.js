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

var permissions = require("../../../../red/api/auth/permissions");


describe("Auth permissions", function() {
    describe("hasPermission", function() {
        it('a user with no permissions',function() {
            permissions.hasPermission({},"*").should.be.false;
        });
        it('a user with global permissions',function() {
            permissions.hasPermission({permissions:"*"},"read").should.be.true;
            permissions.hasPermission({permissions:"*"},"write").should.be.true;
        });
        it('a user with read permissions',function() {
            permissions.hasPermission({permissions:"read"},"read").should.be.true;
            permissions.hasPermission({permissions:"read"},"node.read").should.be.true;
            permissions.hasPermission({permissions:"read"},"write").should.be.false;
            permissions.hasPermission({permissions:"read"},"node.write").should.be.false;
        });
    });
});
