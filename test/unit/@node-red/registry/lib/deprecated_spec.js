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

var deprecated = NR_TEST_UTILS.require("@node-red/registry/lib/deprecated.js");

describe('deprecated', function() {
    it('should return info on a node',function() {
        deprecated.get("irc in").should.eql({module:"node-red-node-irc"});
    });
    it('should return null for non-deprecated node',function() {
        should.not.exist(deprecated.get("foo"));
    });
});
