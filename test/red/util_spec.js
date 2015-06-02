/**
 * Copyright 2014, 2015 IBM Corp.
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
var util = require("../../red/util");

describe("red/util", function() {
    describe('generateId', function() {
        it('generates an id', function() {
            var id = util.generateId();
            var id2 = util.generateId();
            id.should.not.eql(id2);
        });
    });
    describe('compareObjects', function() {
        it('unequal arrays are unequal', function() {
            util.compareObjects(["a"],"a").should.equal(false);
        });
        it('unequal key lengths are unequal', function() {
            util.compareObjects({"a":1},{"a":1,"b":1}).should.equal(false);
        });
    });

    describe('ensureString', function() {
        it('strings are preserved', function() {
            util.ensureString('string').should.equal('string');
        });
        it('Buffer is converted', function() {
            var s = util.ensureString(new Buffer('foo'));
            s.should.equal('foo');
            (typeof s).should.equal('string');
        });
        it('Object is converted to JSON', function() {
            var s = util.ensureString({foo: "bar"});
            (typeof s).should.equal('string');
            should.deepEqual(JSON.parse(s), {foo:"bar"});
        });
        it('stringifies other things', function() {
            var s = util.ensureString(123);
            (typeof s).should.equal('string');
            s.should.equal('123');
        });
    });

    describe('ensureBuffer', function() {
        it('Buffers are preserved', function() {
            var b = new Buffer('');
            util.ensureBuffer(b).should.equal(b);
        });
        it('string is converted', function() {
            var b = util.ensureBuffer('foo');
            var expected = new Buffer('foo');
            for (var i = 0; i < expected.length; i++) {
                b[i].should.equal(expected[i]);
            }
            Buffer.isBuffer(b).should.equal(true);
        });
        it('Object is converted to JSON', function() {
            var obj = {foo: "bar"}
            var b = util.ensureBuffer(obj);
            Buffer.isBuffer(b).should.equal(true);
            should.deepEqual(JSON.parse(b), obj);
        });
        it('stringifies other things', function() {
            var b = util.ensureBuffer(123);
            Buffer.isBuffer(b).should.equal(true);
            var expected = new Buffer('123');
            for (var i = 0; i < expected.length; i++) {
                b[i].should.equal(expected[i]);
            }
        });
    });

    describe('cloneMessage', function() {
        it('clones a simple message', function() {
            var msg = {string:"hi",array:[1,2,3],object:{a:1,subobject:{b:2}}};

            var cloned = util.cloneMessage(msg);

            cloned.should.eql(msg);

            cloned.should.not.equal(msg);
            cloned.array.should.not.equal(msg.string);
            cloned.object.should.not.equal(msg.object);
            cloned.object.subobject.should.not.equal(msg.object.subobject);

            cloned.should.not.have.property("req");
            cloned.should.not.have.property("res");
        });
        it('does not clone http req/res properties', function() {
            var msg = {req:{a:1},res:{b:2}};

            var cloned = util.cloneMessage(msg);

            cloned.should.eql(msg);
            cloned.should.not.equal(msg);

            cloned.req.should.equal(msg.req);
            cloned.res.should.equal(msg.res);
        });

    });
});
