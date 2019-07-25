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
var util = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/util");

describe('storage/localfilesystem/util', function() {
    describe('parseJSON', function() {
        it('returns parsed JSON', function() {
            var result = util.parseJSON('{"a":123}');
            result.should.eql({a:123});
        })
        it('ignores BOM character', function() {
            var result = util.parseJSON('\uFEFF{"a":123}');
            result.should.eql({a:123});
        })
    })
});
