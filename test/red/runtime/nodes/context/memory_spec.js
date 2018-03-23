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

var should = require('should');
var context = require('../../../../../red/runtime/nodes/context/memory');

describe('memory',function() {

    beforeEach(function() {
        context.init({});
    });

    describe('#get/set',function() {
        it('should store property',function() {
            should.not.exist(context.get("foo","nodeX"));
            context.set("foo","test","nodeX");
            context.get("foo","nodeX").should.eql("test");
        });

        it('should store property - creates parent properties',function() {
            context.set("foo.bar","test","nodeX");
            context.get("foo","nodeX").should.eql({bar:"test"});
        });

        it('should delete property',function() {
            context.set("foo.abc.bar1","test1","nodeX");
            context.set("foo.abc.bar2","test2","nodeX");
            context.get("foo.abc","nodeX").should.eql({bar1:"test1",bar2:"test2"});
            context.set("foo.abc.bar1",undefined,"nodeX");
            context.get("foo.abc","nodeX").should.eql({bar2:"test2"});
            context.set("foo.abc",undefined,"nodeX");
            should.not.exist(context.get("foo.abc","nodeX"));
            context.set("foo",undefined,"nodeX");
            should.not.exist(context.get("foo","nodeX"));
        });

        it('should not shared context with other scope', function() {
            should.not.exist(context.get("foo","nodeX"));
            should.not.exist(context.get("foo","nodeY"));
            context.set("foo","testX","nodeX");
            context.set("foo","testY","nodeY");

            context.get("foo","nodeX").should.eql("testX");
            context.get("foo","nodeY").should.eql("testY");
        });
    });

    describe('#keys',function() {
        it('should enumerate context keys', function() {
            var keys = context.keys("nodeX");
            keys.should.be.an.Array();
            keys.should.be.empty();

            context.set("foo","bar","nodeX");
            keys = context.keys("nodeX");
            keys.should.have.length(1);
            keys[0].should.eql("foo");

            context.set("abc.def","bar","nodeX");
            keys = context.keys("nodeX");
            keys.should.have.length(2);
            keys[1].should.eql("abc");
        });

        it('should enumerate context keys in each scopes', function() {
            var keysX = context.keys("nodeX");
            keysX.should.be.an.Array();
            keysX.should.be.empty();

            var keysY = context.keys("nodeY");
            keysY.should.be.an.Array();
            keysY.should.be.empty();

            context.set("foo","bar","nodeX");
            context.set("hoge","piyo","nodeY");
            keysX = context.keys("nodeX");
            keysX.should.have.length(1);
            keysX[0].should.eql("foo");

            keysY = context.keys("nodeY");
            keysY.should.have.length(1);
            keysY[0].should.eql("hoge");
        });

        it('should enumerate only context keys when GlobalContext was given', function() {
            var keys = context.keys("global");
            keys.should.be.an.Array();
            keys.should.be.empty();

            var data = {
                foo: "bar"
            }
            context.setGlobalContext(data);
            keys = context.keys("global");
            keys.should.have.length(1);
            keys[0].should.eql("foo");
        });
    });

    describe('#delete',function() {
        it('should delete context',function() {
            should.not.exist(context.get("foo","nodeX"));
            should.not.exist(context.get("foo","nodeY"));
            context.set("foo","abc","nodeX");
            context.set("foo","abc","nodeY");
            context.get("foo","nodeX").should.eql("abc");
            context.get("foo","nodeY").should.eql("abc");

            context.delete("nodeX");
            should.not.exist(context.get("foo","nodeX"));
            should.exist(context.get("foo","nodeY"));
        });
    });

    describe('#setGlobalContext',function() {
        it('should initialize global context with argument', function() {
            var keys = context.keys("global");
            keys.should.be.an.Array();
            keys.should.be.empty();

            var data = {
                foo: "bar"
            }
            context.setGlobalContext(data);
            context.get("foo","global").should.eql("bar");
        });
    });
});