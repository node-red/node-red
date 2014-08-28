/**
 * Copyright 2014 IBM Corp.
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
var utils = require("../../red/utils");

describe("red/utils", function() {
    describe('ensureString', function() {
        it('strings are preserved', function() {
            utils.ensureString('string').should.equal('string');
        });
        it('Buffer is converted', function() {
            var s = utils.ensureString(new Buffer('foo'));
            s.should.equal('foo');
            (typeof s).should.equal('string');
        });
        it('Object is converted to JSON', function() {
            var s = utils.ensureString({foo: "bar"});
            (typeof s).should.equal('string');
            should.deepEqual(JSON.parse(s), {foo:"bar"});
        });
        it('stringifies other things', function() {
            var s = utils.ensureString(123);
            (typeof s).should.equal('string');
            s.should.equal('123');
        });
    });
});

