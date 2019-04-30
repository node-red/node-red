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
var NR_TEST_UTILS = require("nr-test-utils");

var Memory =  NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/context/memory");

describe('memory',function() {
    var context;

    beforeEach(function() {
        context = Memory({});
        return context.open();
    });

    afterEach(function() {
        return context.clean([]).then(function(){
            return context.close();
        });
    });

    describe('#get/set',function() {
        describe('sync',function() {
            it('should store property',function() {
                should.not.exist(context.get("nodeX","foo"));
                context.set("nodeX","foo","test");
                context.get("nodeX","foo").should.equal("test");
            });

            it('should store property - creates parent properties',function() {
                context.set("nodeX","foo.bar","test");
                context.get("nodeX","foo").should.eql({bar:"test"});
            });

            it('should delete property',function() {
                context.set("nodeX","foo.abc.bar1","test1");
                context.set("nodeX","foo.abc.bar2","test2");
                context.get("nodeX","foo.abc").should.eql({bar1:"test1",bar2:"test2"});
                context.set("nodeX","foo.abc.bar1",undefined);
                context.get("nodeX","foo.abc").should.eql({bar2:"test2"});
                context.set("nodeX","foo.abc",undefined);
                should.not.exist(context.get("nodeX","foo.abc"));
                context.set("nodeX","foo",undefined);
                should.not.exist(context.get("nodeX","foo"));
            });

            it('should not shared context with other scope', function() {
                should.not.exist(context.get("nodeX","foo"));
                should.not.exist(context.get("nodeY","foo"));
                context.set("nodeX","foo","testX");
                context.set("nodeY","foo","testY");

                context.get("nodeX","foo").should.equal("testX");
                context.get("nodeY","foo").should.equal("testY");
            });

            it('should throw the error if the error occurs', function() {
                try{
                    context.set("nodeX",".foo","test");
                    should.fail("Error was not thrown");
                }catch(err){
                    should.exist(err);
                    try{
                        context.get("nodeX",".foo");
                        should.fail("Error was not thrown");
                    }catch(err){
                        should.exist(err);
                    }
                }
            });

            it('should get multiple values - all known', function() {
                context.set("nodeX","one","test1");
                context.set("nodeX","two","test2");
                context.set("nodeX","three","test3");
                context.set("nodeX","four","test4");

                var values = context.get("nodeX",["one","two","four"]);
                values.should.eql(["test1","test2","test4"])
            })
            it('should get multiple values - include unknown', function() {
                context.set("nodeX","one","test1");
                context.set("nodeX","two","test2");
                context.set("nodeX","three","test3");
                context.set("nodeX","four","test4");

                var values = context.get("nodeX",["one","unknown.with.multiple.levels"]);
                values.should.eql(["test1",undefined])
            })
            it('should throw error if bad key included in multiple keys', function() {
                context.set("nodeX","one","test1");
                context.set("nodeX","two","test2");
                context.set("nodeX","three","test3");
                context.set("nodeX","four","test4");

                try{
                    var values = context.get("nodeX",["one",".foo","three"]);
                    should.fail("Error was not thrown");
                }catch(err){
                    should.exist(err);
                }
            })


        });

        describe('async',function() {
            it('should store property',function(done) {
                context.get("nodeX","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","test",function(err){
                        context.get("nodeX","foo",function(err, value){
                            value.should.equal("test");
                            done();
                        });
                    });
                });
            });

            it('should pass the error to callback if the error occurs',function(done) {
                context.set("nodeX",".foo","test",function(err, value){
                    should.exist(err);
                    context.get("nodeX",".foo",function(err){
                        should.exist(err);
                        done();
                    });
                });
            });

            it('should get multiple values - all known', function(done) {
                context.set("nodeX","one","test1");
                context.set("nodeX","two","test2");
                context.set("nodeX","three","test3");
                context.set("nodeX","four","test4");

                context.get("nodeX",["one","two","four"],function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1","test2","test4"])
                    done();
                });
            })
            it('should get multiple values - include unknown', function(done) {
                context.set("nodeX","one","test1");
                context.set("nodeX","two","test2");
                context.set("nodeX","three","test3");
                context.set("nodeX","four","test4");

                context.get("nodeX",["one","unknown"],function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1",undefined])
                    done();
                });
            })
            it('should throw error if bad key included in multiple keys', function(done) {
                context.set("nodeX","one","test1");
                context.set("nodeX","two","test2");
                context.set("nodeX","three","test3");
                context.set("nodeX","four","test4");

                context.get("nodeX",["one",".foo","three"], function(err) {
                    should.exist(err);
                    done();
                });
            })
        });
    });

    describe('#keys',function() {
        describe('sync',function() {
            it('should enumerate context keys', function() {
                var keys = context.keys("nodeX");
                keys.should.be.an.Array();
                keys.should.be.empty();

                context.set("nodeX","foo","bar");
                keys = context.keys("nodeX");
                keys.should.have.length(1);
                keys[0].should.equal("foo");

                context.set("nodeX","abc.def","bar");
                keys = context.keys("nodeX");
                keys.should.have.length(2);
                keys[1].should.equal("abc");
            });

            it('should enumerate context keys in each scopes', function() {
                var keysX = context.keys("nodeX");
                keysX.should.be.an.Array();
                keysX.should.be.empty();

                var keysY = context.keys("nodeY");
                keysY.should.be.an.Array();
                keysY.should.be.empty();

                context.set("nodeX","foo","bar");
                context.set("nodeY","hoge","piyo");
                keysX = context.keys("nodeX");
                keysX.should.have.length(1);
                keysX[0].should.equal("foo");

                keysY = context.keys("nodeY");
                keysY.should.have.length(1);
                keysY[0].should.equal("hoge");
            });

            it('should enumerate global context keys', function () {
                var keys = context.keys("global");
                keys.should.be.an.Array();
                keys.should.be.empty();

                context.set("global", "foo", "bar");
                keys = context.keys("global");
                keys.should.have.length(1);
                keys[0].should.equal("foo");

                context.set("global", "abc.def", "bar");
                keys = context.keys("global");
                keys.should.have.length(2);
                keys[1].should.equal("abc");
            });

            it('should not return specific keys as global context keys', function () {
                var keys = context.keys("global");

                context.set("global", "set", "bar");
                context.set("global", "get", "bar");
                context.set("global", "keys", "bar");
                keys = context.keys("global");
                keys.should.have.length(0);
            });
        });

        describe('async',function() {
            it('should enumerate context keys', function(done) {
                context.keys("nodeX", function(err, keys) {
                    keys.should.be.an.Array();
                    keys.should.be.empty();
                    context.set("nodeX", "foo", "bar", function(err) {
                        context.keys("nodeX", function(err, keys) {
                            keys.should.have.length(1);
                            keys[0].should.equal("foo");
                            context.set("nodeX","abc.def","bar",function(err){
                                context.keys("nodeX",function(err, keys){
                                    keys.should.have.length(2);
                                    keys[1].should.equal("abc");
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#delete',function() {
        it('should delete context',function() {
            should.not.exist(context.get("nodeX","foo"));
            should.not.exist(context.get("nodeY","foo"));
            context.set("nodeX","foo","abc");
            context.set("nodeY","foo","abc");
            context.get("nodeX","foo").should.equal("abc");
            context.get("nodeY","foo").should.equal("abc");

            return context.delete("nodeX").then(function(){
                should.not.exist(context.get("nodeX","foo"));
                should.exist(context.get("nodeY","foo"));
            });
        });
    });

    describe('#clean',function() {
        it('should clean unnecessary context',function() {
            should.not.exist(context.get("nodeX","foo"));
            should.not.exist(context.get("nodeY","foo"));
            context.set("nodeX","foo","abc");
            context.set("nodeY","foo","abc");
            context.get("nodeX","foo").should.equal("abc");
            context.get("nodeY","foo").should.equal("abc");

            return context.clean([]).then(function(){
                should.not.exist(context.get("nodeX","foo"));
                should.not.exist(context.get("nodeY","foo"));
            });
        });
        it('should not clean active context',function() {
            should.not.exist(context.get("nodeX","foo"));
            should.not.exist(context.get("nodeY","foo"));
            context.set("nodeX","foo","abc");
            context.set("nodeY","foo","abc");
            context.get("nodeX","foo").should.equal("abc");
            context.get("nodeY","foo").should.equal("abc");

            return context.clean(["nodeX"]).then(function(){
                should.exist(context.get("nodeX","foo"));
                should.not.exist(context.get("nodeY","foo"));
            });
        });
        it('should not clean global context', function () {
            context.set("global", "foo", "abc");
            context.get("global", "foo").should.equal("abc");

            return context.clean(["global"]).then(function () {
                should.exist(context.get("global", "foo"));
            });
        });
    });

});
