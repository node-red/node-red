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
var util = require("../../../red/runtime/util");

describe("red/util", function() {
    describe('generateId', function() {
        it('generates an id', function() {
            var id = util.generateId();
            var id2 = util.generateId();
            id.should.not.eql(id2);
        });
    });
    describe('compareObjects', function() {
        it('numbers', function() {
            util.compareObjects(0,0).should.equal(true);
            util.compareObjects(0,1).should.equal(false);
            util.compareObjects(1000,1001).should.equal(false);
            util.compareObjects(1000,1000).should.equal(true);
            util.compareObjects(0,"0").should.equal(false);
            util.compareObjects(1,"1").should.equal(false);
            util.compareObjects(0,null).should.equal(false);
            util.compareObjects(0,undefined).should.equal(false);
        });
        it('strings', function() {
            util.compareObjects("","").should.equal(true);
            util.compareObjects("a","a").should.equal(true);
            util.compareObjects("",null).should.equal(false);
            util.compareObjects("",undefined).should.equal(false);
        });

        it('arrays', function() {
            util.compareObjects(["a"],["a"]).should.equal(true);
            util.compareObjects(["a"],["a","b"]).should.equal(false);
            util.compareObjects(["a","b"],["b"]).should.equal(false);
            util.compareObjects(["a"],"a").should.equal(false);
            util.compareObjects([[1],["a"]],[[1],["a"]]).should.equal(true);
            util.compareObjects([[1],["a"]],[["a"],[1]]).should.equal(false);
        });
        it('objects', function() {
            util.compareObjects({"a":1},{"a":1,"b":1}).should.equal(false);
            util.compareObjects({"a":1,"b":1},{"a":1,"b":1}).should.equal(true);
            util.compareObjects({"b":1,"a":1},{"a":1,"b":1}).should.equal(true);
        });
        it('Buffer', function() {
            util.compareObjects(new Buffer("hello"),new Buffer("hello")).should.equal(true);
            util.compareObjects(new Buffer("hello"),new Buffer("hello ")).should.equal(false);
            util.compareObjects(new Buffer("hello"),"hello").should.equal(false);
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

    describe('getMessageProperty', function() {
        it('retrieves a simple property', function() {
            var v = util.getMessageProperty({a:"foo"},"msg.a");
            v.should.eql("foo");
            var v2 = util.getMessageProperty({a:"foo"},"a");
            v2.should.eql("foo");
        });
        it('should return undefined if property does not exist', function() {
            var v = util.getMessageProperty({a:"foo"},"msg.b");
            should.not.exist(v);
        });
        it('should throw error if property parent does not exist', function() {
            /*jshint immed: false */
            (function() {
                util.getMessageProperty({a:"foo"},"msg.a.b.c");
            }).should.throw();
        });
        it('retrieves a property with array syntax', function() {
            var v = util.getMessageProperty({a:["foo","bar"]},"msg.a[0]");
            v.should.eql("foo");
            var v2 = util.getMessageProperty({a:[null,{b:"foo"}]},"a[1].b");
            v2.should.eql("foo");
            var v3 = util.getMessageProperty({a:[[["foo"]]]},"a[0][0][0]");
            v3.should.eql("foo");
        });

    });

    describe('setMessageProperty', function() {
        it('sets a property', function() {
            var msg = {a:"foo"};
            util.setMessageProperty(msg,"msg.a","bar");
            msg.a.should.eql('bar');
        });
        it('sets a deep level property', function() {
            var msg = {a:{b:{c:"foo"}}};
            util.setMessageProperty(msg,"msg.a.b.c","bar");
            msg.a.b.c.should.eql('bar');
        });
        it('creates missing parent properties by default', function() {
            var msg = {a:{}};
            util.setMessageProperty(msg,"msg.a.b.c","bar");
            msg.a.b.c.should.eql('bar');
        })
        it('does not create missing parent properties', function() {
            var msg = {a:{}};
            util.setMessageProperty(msg,"msg.a.b.c","bar",false);
            should.not.exist(msg.a.b);
        })
        it('deletes property if value is undefined', function() {
            var msg = {a:{b:{c:"foo"}}};
            util.setMessageProperty(msg,"msg.a.b.c",undefined);
            should.not.exist(msg.a.b.c);
        })
        it('does not create missing parent properties if value is undefined', function() {
            var msg = {a:{}};
            util.setMessageProperty(msg,"msg.a.b.c",undefined);
            should.not.exist(msg.a.b);
        });
        it('sets a property with array syntax', function() {
            var msg = {a:{b:["foo",{c:["",""]}]}};
            util.setMessageProperty(msg,"msg.a.b[1].c[1]","bar");
            msg.a.b[1].c[1].should.eql('bar');
        });
        it('creates missing array elements - final property', function() {
            var msg = {a:[]};
            util.setMessageProperty(msg,"msg.a[2]","bar");
            msg.a.should.have.length(3);
            msg.a[2].should.eql("bar");
        });
        it('creates missing array elements - mid property', function() {
            var msg = {};
            util.setMessageProperty(msg,"msg.a[2].b","bar");
            msg.a.should.have.length(3);
            msg.a[2].b.should.eql("bar");
        });
        it('creates missing array elements - multi-arrays', function() {
            var msg = {};
            util.setMessageProperty(msg,"msg.a[2][2]","bar");
            msg.a.should.have.length(3);
            msg.a.should.be.instanceOf(Array);
            msg.a[2].should.have.length(3);
            msg.a[2].should.be.instanceOf(Array);
            msg.a[2][2].should.eql("bar");
        });
        it('does not create missing array elements - final property', function() {
            var msg = {a:{}};
            util.setMessageProperty(msg,"msg.a.b[2]","bar",false);
            should.not.exist(msg.a.b);
            // check it has not been misinterpreted
            msg.a.should.not.have.property("b[2]");
        });
        it('deletes property inside array if value is undefined', function() {
            var msg = {a:[1,2,3]};
            util.setMessageProperty(msg,"msg.a[1]",undefined);
            msg.a.should.have.length(2);
            msg.a[0].should.eql(1);
            msg.a[1].should.eql(3);
        })

    });

    describe('evaluateNodeProperty', function() {
        it('returns string',function() {
            var result = util.evaluateNodeProperty('hello','str');
            result.should.eql('hello');
        });
        it('returns number',function() {
            var result = util.evaluateNodeProperty('0123','num');
            result.should.eql(123);
        });
        it('returns evaluated json',function() {
            var result = util.evaluateNodeProperty('{"a":123}','json');
            result.should.eql({a:123});
        });
        it('returns regex',function() {
            var result = util.evaluateNodeProperty('^abc$','re');
            result.toString().should.eql("/^abc$/");
        });
        it('returns boolean',function() {
            var result = util.evaluateNodeProperty('true','bool');
            result.should.be.true();
            result = util.evaluateNodeProperty('TrUe','bool');
            result.should.be.true();
            result = util.evaluateNodeProperty('false','bool');
            result.should.be.false();
            result = util.evaluateNodeProperty('','bool');
            result.should.be.false();
        });
        it('returns date',function() {
            var result = util.evaluateNodeProperty('','date');
            (Date.now() - result).should.be.approximately(0,50);
        });
        it('returns msg property',function() {
            var result = util.evaluateNodeProperty('foo.bar','msg',{},{foo:{bar:"123"}});
            result.should.eql("123");
        });
        it('returns flow property',function() {
            var result = util.evaluateNodeProperty('foo.bar','flow',{
                context:function() { return {
                    flow: { get: function(k) {
                        if (k === 'foo.bar') {
                            return '123';
                        } else {
                            return null;
                        }
                    }}
                }}
            },{});
            result.should.eql("123");
        });
        it('returns global property',function() {
            var result = util.evaluateNodeProperty('foo.bar','global',{
                context:function() { return {
                    global: { get: function(k) {
                        if (k === 'foo.bar') {
                            return '123';
                        } else {
                            return null;
                        }
                    }}
                }}
            },{});
            result.should.eql("123");
        });
    });

    describe('normalisePropertyExpression', function() {
        function testABC(input,expected) {
            var result = util.normalisePropertyExpression(input);
            // console.log("+",input);
            // console.log(result);
            result.should.eql(expected);
        }

        function testInvalid(input) {
            /*jshint immed: false */
            (function() {
                util.normalisePropertyExpression(input);
            }).should.throw();
        }
        it('pass a.b.c',function() { testABC('a.b.c',['a','b','c']); })
        it('pass a["b"]["c"]',function() { testABC('a["b"]["c"]',['a','b','c']); })
        it('pass a["b"].c',function() { testABC('a["b"].c',['a','b','c']); })
        it("pass a['b'].c",function() { testABC("a['b'].c",['a','b','c']); })

        it("pass a[0].c",function() { testABC("a[0].c",['a',0,'c']); })
        it("pass a.0.c",function() { testABC("a.0.c",['a',0,'c']); })
        it("pass a['a.b[0]'].c",function() { testABC("a['a.b[0]'].c",['a','a.b[0]','c']); })
        it("pass a[0][0][0]",function() { testABC("a[0][0][0]",['a',0,0,0]); })
        it("pass '1.2.3.4'",function() { testABC("'1.2.3.4'",['1.2.3.4']); })
        it("pass 'a.b'[1]",function() { testABC("'a.b'[1]",['a.b',1]); })
        it("pass 'a.b'.c",function() { testABC("'a.b'.c",['a.b','c']); })


        it('pass a.$b.c',function() { testABC('a.$b.c',['a','$b','c']); })
        it('pass a["$b"].c',function() { testABC('a["$b"].c',['a','$b','c']); })
        it('pass a._b.c',function() { testABC('a._b.c',['a','_b','c']); })
        it('pass a["_b"].c',function() { testABC('a["_b"].c',['a','_b','c']); })

        it("fail a'b'.c",function() { testInvalid("a'b'.c"); })
        it("fail a['b'.c",function() { testInvalid("a['b'.c"); })
        it("fail a[]",function() { testInvalid("a[]"); })
        it("fail a]",function() { testInvalid("a]"); })
        it("fail a[",function() { testInvalid("a["); })
        it("fail a[0d]",function() { testInvalid("a[0d]"); })
        it("fail a['",function() { testInvalid("a['"); })
        it("fail a[']",function() { testInvalid("a[']"); })
        it("fail a[0']",function() { testInvalid("a[0']"); })
        it("fail a.[0]",function() { testInvalid("a.[0]"); })
        it("fail [0]",function() { testInvalid("[0]"); })
        it("fail a[0",function() { testInvalid("a[0"); })
        it("fail a.",function() { testInvalid("a."); })
        it("fail .a",function() { testInvalid(".a"); })
        it("fail a. b",function() { testInvalid("a. b"); })
        it("fail  a.b",function() { testInvalid(" a.b"); })
        it("fail a[0].[1]",function() { testInvalid("a[0].[1]"); })
        it("fail a['']",function() { testInvalid("a['']"); })
        it("fail 'a.b'c",function() { testInvalid("'a.b'c"); })
        it("fail <blank>",function() { testInvalid("");})

    });
});
