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

var util = NR_TEST_UTILS.require("@node-red/util").util;

describe("@node-red/util/util", function() {
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
            util.compareObjects(Buffer.from("hello"),Buffer.from("hello")).should.equal(true);
            util.compareObjects(Buffer.from("hello"),Buffer.from("hello ")).should.equal(false);
            util.compareObjects(Buffer.from("hello"),"hello").should.equal(false);
        });

    });

    describe('ensureString', function() {
        it('strings are preserved', function() {
            util.ensureString('string').should.equal('string');
        });
        it('Buffer is converted', function() {
            var s = util.ensureString(Buffer.from('foo'));
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
            var b = Buffer.from('');
            util.ensureBuffer(b).should.equal(b);
        });
        it('string is converted', function() {
            var b = util.ensureBuffer('foo');
            var expected = Buffer.from('foo');
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
            var expected = Buffer.from('123');
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
        it('handles undefined values without throwing an error', function() {
            var result = util.cloneMessage(undefined);
            should.not.exist(result);
        })
    });
    describe('getObjectProperty', function() {
        it('gets a property beginning with "msg."', function() {
            // getMessageProperty strips off `msg.` prefixes.
            // getObjectProperty does not
            var obj = { msg: { a: "foo"}, a: "bar"};
            var v = util.getObjectProperty(obj,"msg.a");
            v.should.eql("foo");
        })
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
    describe('setObjectProperty', function() {
        it('set a property beginning with "msg."', function() {
            // setMessageProperty strips off `msg.` prefixes.
            // setObjectProperty does not
            var obj = {};
            util.setObjectProperty(obj,"msg.a","bar");
            obj.should.have.property("msg");
            obj.msg.should.have.property("a","bar");
        })
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
        it('does not create missing parent properties with array', function () {
            var msg = {a:{}};
            util.setMessageProperty(msg, "msg.a.b[1].c", "bar", false);
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
        it('does not create missing array elements - mid property', function () {
            var msg = {a:[]};
            util.setMessageProperty(msg, "msg.a[1][1]", "bar", false);
            msg.a.should.empty();
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
        it('returns bin', function () {
            var result = util.evaluateNodeProperty('[1, 2]','bin');
            result[0].should.eql(1);
            result[1].should.eql(2);
        });
        it('returns msg property',function() {
            var result = util.evaluateNodeProperty('foo.bar','msg',{},{foo:{bar:"123"}});
            result.should.eql("123");
        });
        it('throws an error if callback is not defined', function (done) {
            try {
                util.evaluateNodeProperty(' ','msg',{},{foo:{bar:"123"}});
                done("should throw an error");
            } catch (err) {
                done();
            }
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
        it('returns jsonata result', function () {
            var result = util.evaluateNodeProperty('$abs(-1)','jsonata',{},{});
            result.should.eql(1);
        });
        it('returns null', function() {
            var result = util.evaluateNodeProperty(null,'null');
            (result === null).should.be.true();
        })
        describe('environment variable', function() {
            before(function() {
                process.env.NR_TEST_A = "foo";
                process.env.NR_TEST_B = "${NR_TEST_A}";
            })
            after(function() {
                delete process.env.NR_TEST_A;
                delete process.env.NR_TEST_B;
            })

            it('returns an environment variable - NR_TEST_A', function() {
                var result = util.evaluateNodeProperty('NR_TEST_A','env');
                result.should.eql('foo');
            });
            it('returns an environment variable - ${NR_TEST_A}', function() {
                var result = util.evaluateNodeProperty('${NR_TEST_A}','env');
                result.should.eql('foo');
            });
            it('returns an environment variable - ${NR_TEST_A', function() {
                var result = util.evaluateNodeProperty('${NR_TEST_A','env');
                result.should.eql('');
            });
            it('returns an environment variable - foo${NR_TEST_A}bar', function() {
                var result = util.evaluateNodeProperty('123${NR_TEST_A}456','env');
                result.should.eql('123foo456');
            });
            it('returns an environment variable - foo${NR_TEST_B}bar', function() {
                var result = util.evaluateNodeProperty('123${NR_TEST_B}456','env');
                result.should.eql('123${NR_TEST_A}456');
            });

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

    describe('normaliseNodeTypeName', function() {
        function normalise(input, expected) {
            var result = util.normaliseNodeTypeName(input);
            result.should.eql(expected);
        }

        it('pass blank',function() { normalise("", "") });
        it('pass ab1',function() { normalise("ab1", "ab1") });
        it('pass AB1',function() { normalise("AB1", "aB1") });
        it('pass a b 1',function() { normalise("a b 1", "aB1") });
        it('pass a-b-1',function() { normalise("a-b-1", "aB1") });
        it('pass  ab1 ',function() { normalise(" ab1 ", "ab1") });
        it('pass _a_b_1_',function() { normalise("_a_b_1_", "aB1") });
        it('pass http request',function() { normalise("http request", "httpRequest") });
        it('pass HttpRequest',function() { normalise("HttpRequest", "httpRequest") });
      });

      describe('prepareJSONataExpression', function() {
          it('prepares an expression', function() {
              var result = util.prepareJSONataExpression('payload',{});
              result.should.have.property('evaluate');
              result.should.have.property('assign');
              result.should.have.property('_legacyMode', false);
          });
          it('prepares a legacyMode expression', function() {
              var result = util.prepareJSONataExpression('msg.payload',{});
              result.should.have.property('evaluate');
              result.should.have.property('assign');
              result.should.have.property('_legacyMode', true);
          });
      });
      describe('evaluateJSONataExpression', function() {
          it('evaluates an expression', function() {
              var expr = util.prepareJSONataExpression('payload',{});
              var result = util.evaluateJSONataExpression(expr,{payload:"hello"});
              result.should.eql("hello");
          });
          it('evaluates a legacyMode expression', function() {
              var expr = util.prepareJSONataExpression('msg.payload',{});
              var result = util.evaluateJSONataExpression(expr,{payload:"hello"});
              result.should.eql("hello");
          });
          it('accesses flow context from an expression', function() {
              var expr = util.prepareJSONataExpression('$flowContext("foo")',{context:function() { return {flow:{get: function(key) { return {'foo':'bar'}[key]}}}}});
              var result = util.evaluateJSONataExpression(expr,{payload:"hello"});
              result.should.eql("bar");
          });
          it('accesses environment variable from an expression', function() {
              process.env.UTIL_ENV = 'foo';
              var expr = util.prepareJSONataExpression('$env("UTIL_ENV")',{});
              var result = util.evaluateJSONataExpression(expr,{});
              result.should.eql('foo');
          });
          it('handles non-existant flow context variable', function() {
              var expr = util.prepareJSONataExpression('$flowContext("nonExistant")',{context:function() { return {flow:{get: function(key) { return {'foo':'bar'}[key]}}}}});
              var result = util.evaluateJSONataExpression(expr,{payload:"hello"});
              should.not.exist(result);
          });
          it('handles non-existant global context variable', function() {
              var expr = util.prepareJSONataExpression('$globalContext("nonExistant")',{context:function() { return {global:{get: function(key) { return {'foo':'bar'}[key]}}}}});
              var result = util.evaluateJSONataExpression(expr,{payload:"hello"});
              should.not.exist(result);
          });
          it('handles async flow context access', function(done) {
              var expr = util.prepareJSONataExpression('$flowContext("foo")',{context:function() { return {flow:{get: function(key,store,callback) { setTimeout(()=>{callback(null,{'foo':'bar'}[key])},10)}}}}});
              util.evaluateJSONataExpression(expr,{payload:"hello"},function(err,value) {
                  try {
                      should.not.exist(err);
                      value.should.eql("bar");
                      done();
                  } catch(err2) {
                      done(err2);
                  }
              });
          })
          it('handles async global context access', function(done) {
              var expr = util.prepareJSONataExpression('$globalContext("foo")',{context:function() { return {global:{get: function(key,store,callback) { setTimeout(()=>{callback(null,{'foo':'bar'}[key])},10)}}}}});
              util.evaluateJSONataExpression(expr,{payload:"hello"},function(err,value) {
                  try {
                      should.not.exist(err);
                      value.should.eql("bar");
                      done();
                  } catch(err2) {
                      done(err2);
                  }
              });
          })
          it('handles persistable store in flow context access', function(done) {
              var storeName;
              var expr = util.prepareJSONataExpression('$flowContext("foo", "flowStoreName")',{context:function() { return {flow:{get: function(key,store,callback) { storeName = store;setTimeout(()=>{callback(null,{'foo':'bar'}[key])},10)}}}}});
              util.evaluateJSONataExpression(expr,{payload:"hello"},function(err,value) {
                  try {
                      should.not.exist(err);
                      value.should.eql("bar");
                      storeName.should.equal("flowStoreName");
                      done();
                  } catch(err2) {
                      done(err2);
                  }
              });
          })
          it('handles persistable store in global context access', function(done) {
              var storeName;
              var expr = util.prepareJSONataExpression('$globalContext("foo", "globalStoreName")',{context:function() { return {global:{get: function(key,store,callback) { storeName = store;setTimeout(()=>{callback(null,{'foo':'bar'}[key])},10)}}}}});
              util.evaluateJSONataExpression(expr,{payload:"hello"},function(err,value) {
                  try {
                      should.not.exist(err);
                      value.should.eql("bar");
                      storeName.should.equal("globalStoreName");
                      done();
                  } catch(err2) {
                      done(err2);
                  }
              });
          })
          it('callbacks with error when invalid expression was specified', function (done) {
              var expr = util.prepareJSONataExpression('$abc(1)',{});
              var result = util.evaluateJSONataExpression(expr,{payload:"hello"},function(err,value){
                  should.exist(err);
                  done();
              });
          });
      });

    describe('encodeObject', function () {
        it('encodes Error with message', function() {
            var err = new Error("encode error");
            err.name = 'encodeError';
            var msg = {msg:err};
            var result = util.encodeObject(msg);
            result.format.should.eql("error");
            var resultJson = JSON.parse(result.msg);
            resultJson.name.should.eql('encodeError');
            resultJson.message.should.eql('encode error');
        });
        it('encodes Error without message', function() {
            var err = new Error();
            err.name = 'encodeError';
            err.toString = function(){return 'error message';}
            var msg = {msg:err};
            var result = util.encodeObject(msg);
            result.format.should.eql("error");
            var resultJson = JSON.parse(result.msg);
            resultJson.name.should.eql('encodeError');
            resultJson.message.should.eql('error message');
        });
        it('encodes Buffer', function() {
            var msg = {msg:Buffer.from("abc")};
            var result = util.encodeObject(msg,{maxLength:4});
            result.format.should.eql("buffer[3]");
            result.msg[0].should.eql('6');
            result.msg[1].should.eql('1');
            result.msg[2].should.eql('6');
            result.msg[3].should.eql('2');
        });
        it('encodes function', function() {
            var msg = {msg:function(){}};
            var result = util.encodeObject(msg);
            result.format.should.eql("function");
            result.msg.should.eql('[function]');
        });
        it('encodes boolean', function() {
            var msg = {msg:true};
            var result = util.encodeObject(msg);
            result.format.should.eql("boolean");
            result.msg.should.eql('true');
        });
        it('encodes number', function() {
            var msg = {msg:123};
            var result = util.encodeObject(msg);
            result.format.should.eql("number");
            result.msg.should.eql('123');
        });
        it('encodes 0', function() {
            var msg = {msg:0};
            var result = util.encodeObject(msg);
            result.format.should.eql("number");
            result.msg.should.eql('0');
        });
        it('encodes null', function() {
            var msg = {msg:null};
            var result = util.encodeObject(msg);
            result.format.should.eql("null");
            result.msg.should.eql('(undefined)');
        });
        it('encodes undefined', function() {
            var msg = {msg:undefined};
            var result = util.encodeObject(msg);
            result.format.should.eql("undefined");
            result.msg.should.eql('(undefined)');
        });
        it('encodes string', function() {
            var msg = {msg:'1234567890'};
            var result = util.encodeObject(msg,{maxLength:6});
            result.format.should.eql("string[10]");
            result.msg.should.eql('123456...');
        });
        describe('encode object', function() {
            it('object', function() {
                var msg = { msg:{"foo":"bar"} };
                var result = util.encodeObject(msg);
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson.foo.should.eql('bar');
            });
            it('object whose name includes error', function() {
                function MyErrorObj(){
                    this.name = 'my error obj';
                    this.message = 'my error message';
                };
                var msg = { msg:new MyErrorObj() };
                var result = util.encodeObject(msg);
                result.format.should.eql("MyErrorObj");
                var resultJson = JSON.parse(result.msg);
                resultJson.name.should.eql('my error obj');
                resultJson.message.should.eql('my error message');
            });
            it('constructor of IncomingMessage', function() {
                function IncomingMessage(){};
                var msg = { msg:new IncomingMessage() };
                var result = util.encodeObject(msg);
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson.should.empty();
            });
            it('_req key in msg', function() {
                function Socket(){};
                var msg = { msg:{"_req":123} };
                var result = util.encodeObject(msg);
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson._req.__enc__.should.eql(true);
                resultJson._req.type.should.eql('internal');
            });
            it('_res key in msg', function() {
                function Socket(){};
                var msg = { msg:{"_res":123} };
                var result = util.encodeObject(msg);
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson._res.__enc__.should.eql(true);
                resultJson._res.type.should.eql('internal');
            });
            it('array of error', function() {
                var msg = { msg:[new Error("encode error")] };
                var result = util.encodeObject(msg);
                result.format.should.eql("array[1]");
                var resultJson = JSON.parse(result.msg);
                resultJson[0].should.eql('Error: encode error');
            });
            it('long array in msg', function() {
                var msg = {msg:{array:[1,2,3,4]}};
                var result = util.encodeObject(msg,{maxLength:2});
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson.array.__enc__.should.eql(true);
                resultJson.array.data[0].should.eql(1);
                resultJson.array.data[1].should.eql(2);
                resultJson.array.length.should.eql(4);
            });
            it('array of string', function() {
                var msg = { msg:["abcde","12345"] };
                var result = util.encodeObject(msg,{maxLength:3});
                result.format.should.eql("array[2]");
                var resultJson = JSON.parse(result.msg);
                resultJson[0].should.eql('abc...');
                resultJson[1].should.eql('123...');
            });
            it('array of function', function() {
                var msg = { msg:[function(){}] };
                var result = util.encodeObject(msg);
                result.format.should.eql("array[1]");
                var resultJson = JSON.parse(result.msg);
                resultJson[0].__enc__.should.eql(true);
                resultJson[0].type.should.eql('function');
            });
            it('array of number', function() {
                var msg = { msg:[1,2,3] };
                var result = util.encodeObject(msg,{maxLength:2});
                result.format.should.eql("array[3]");
                var resultJson = JSON.parse(result.msg);
                resultJson.__enc__.should.eql(true);
                resultJson.data[0].should.eql(1);
                resultJson.data[1].should.eql(2);
                resultJson.data.length.should.eql(2);
                resultJson.length.should.eql(3);
            });
            it('array of special number', function() {
                var msg = { msg:[NaN,Infinity,-Infinity] };
                var result = util.encodeObject(msg);
                result.format.should.eql("array[3]");
                var resultJson = JSON.parse(result.msg);
                resultJson[0].__enc__.should.eql(true);
                resultJson[0].type.should.eql('number');
                resultJson[0].data.should.eql('NaN');
                resultJson[1].data.should.eql('Infinity');
                resultJson[2].data.should.eql('-Infinity');
            });
            it('constructor of Buffer in msg', function() {
                var msg = { msg:{buffer:Buffer.from([1,2,3,4])} };
                var result = util.encodeObject(msg,{maxLength:2});
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson.buffer.__enc__.should.eql(true);
                resultJson.buffer.length.should.eql(4);
                resultJson.buffer.data[0].should.eql(1);
                resultJson.buffer.data[1].should.eql(2);
            });
            it('constructor of ServerResponse', function() {
                function ServerResponse(){};
                var msg = { msg: new ServerResponse() };
                var result = util.encodeObject(msg);
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson.should.eql('[internal]');
            });
            it('constructor of Socket in msg', function() {
                function Socket(){};
                var msg = { msg: { socket: new Socket() } };
                var result = util.encodeObject(msg);
                result.format.should.eql("Object");
                var resultJson = JSON.parse(result.msg);
                resultJson.socket.should.eql('[internal]');
            });
            it('object which fails to serialise', function(done) {
                var msg = {
                    msg: {
                        obj:{
                            cantserialise:{
                                message:'this will not be displayed',
                                toJSON: function(val) {
                                    throw 'this exception should have been caught';
                                    return 'should not display because we threw first';
                                },
                            },
                            canserialise:{
                                message:'this should be displayed',
                            }
                        },
                    }
                };
                var result = util.encodeObject(msg);
                result.format.should.eql("error");
                var success = (result.msg.indexOf('cantserialise') > 0);
                success &= (result.msg.indexOf('this exception should have been caught') > 0);
                success &= (result.msg.indexOf('canserialise') > 0);
                success.should.eql(1);
                done();
            });
            it('object which fails to serialise - different error type', function(done) {
                var msg = {
                    msg: {
                        obj:{
                            cantserialise:{
                                message:'this will not be displayed',
                                toJSON: function(val) {
                                    throw new Error('this exception should have been caught');
                                    return 'should not display because we threw first';
                                },
                            },
                            canserialise:{
                                message:'this should be displayed',
                            }
                        },
                    }
                };
                var result = util.encodeObject(msg);
                result.format.should.eql("error");
                var success = (result.msg.indexOf('cantserialise') > 0);
                success &= (result.msg.indexOf('this exception should have been caught') > 0);
                success &= (result.msg.indexOf('canserialise') > 0);
                success.should.eql(1);
                done();
            });
            it('very large object which fails to serialise should be truncated', function(done) {
                var msg = {
                    msg: {
                        obj:{
                            big:"",
                            cantserialise:{
                                message:'this will not be displayed',
                                toJSON: function(val) {
                                    throw new Error('this exception should have been caught');
                                    return 'should not display because we threw first';
                                },
                            },
                            canserialise:{
                                message:'this should be displayed',
                            }
                        },
                    }
                };

                for (var i = 0; i < 1000; i++) {
                    msg.msg.obj.big += 'some more string ';
                }

                var result = util.encodeObject(msg);
                result.format.should.eql("error");
                var resultJson = JSON.parse(result.msg);
                var success = (resultJson.message.length <= 1000);
                success.should.eql(true);
                done();
            });
            it('test bad toString', function(done) {
                var msg = {
                    msg: {
                        mystrangeobj:"hello",
                    },
                };
                msg.msg.toString = function(){
                    throw new Error('Exception in toString - should have been caught');
                }
                msg.msg.constructor = { name: "strangeobj" };

                var result = util.encodeObject(msg);
                var success = (result.msg.indexOf('[Type not printable]') >= 0);
                success.should.eql(true);
                done();
            });
            it('test bad object constructor', function(done) {
                var msg = {
                    msg: {
                        mystrangeobj:"hello",
                        constructor: {
                            get name(){
                                throw new Error('Exception in constructor name');
                            }
                        }
                    },
                };
                var result = util.encodeObject(msg);
                done();
            });

        });
    });
});
