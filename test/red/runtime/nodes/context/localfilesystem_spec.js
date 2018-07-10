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
var fs = require('fs-extra');
var path = require("path");
var LocalFileSystem = require('../../../../../red/runtime/nodes/context/localfilesystem');

var resourcesDir = path.resolve(path.join(__dirname,"..","resources","context"));

describe('localfilesystem',function() {
    var context;

    before(function() {
        return fs.remove(resourcesDir);
    });

    beforeEach(function() {
        context = LocalFileSystem({dir: resourcesDir, cache: false});
        return context.open();
    });

    afterEach(function() {
        return context.clean([]).then(function(){
            return context.close().then(function(){
                return fs.remove(resourcesDir);
            });
        });
    });

    describe('#get/set',function() {
        it('should store property',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo","test",function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.equal("test");
                        done();
                    });
                });
            });
        });

        it('should store property - creates parent properties',function(done) {
            context.set("nodeX","foo.bar","test",function(err){
                context.get("nodeX","foo",function(err, value){
                    value.should.be.eql({bar:"test"});
                    done();
                });
            });
        });

        it('should delete property',function(done) {
            context.set("nodeX","foo.abc.bar1","test1",function(err){
                context.set("nodeX","foo.abc.bar2","test2",function(err){
                    context.get("nodeX","foo.abc",function(err, value){
                        value.should.be.eql({bar1:"test1",bar2:"test2"});
                        context.set("nodeX","foo.abc.bar1",undefined,function(err){
                            context.get("nodeX","foo.abc",function(err, value){
                                value.should.be.eql({bar2:"test2"});
                                context.set("nodeX","foo.abc",undefined,function(err){
                                    context.get("nodeX","foo.abc",function(err, value){
                                        should.not.exist(value);
                                        context.set("nodeX","foo",undefined,function(err){
                                            context.get("nodeX","foo",function(err, value){
                                                should.not.exist(value);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should not shared context with other scope', function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.get("nodeY","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","testX",function(err){
                        context.set("nodeY","foo","testY",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.equal("testX"),
                                context.get("nodeY","foo",function(err, value){
                                    value.should.be.equal("testY");
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should store string',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo","bar",function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.String();
                        value.should.be.equal("bar");
                        context.set("nodeX","foo","1",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.String();
                                value.should.be.equal("1");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should store number',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",1,function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Number();
                        value.should.be.equal(1);
                        done();
                    });
                });
            });
        });

        it('should store null',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",null,function(err){
                    context.get("nodeX","foo",function(err, value){
                        should(value).be.null();
                        done();
                    });
                });
            });
        });

        it('should store boolean',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",true,function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Boolean().and.true();
                        context.set("nodeX","foo",false,function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.Boolean().and.false();
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should store object',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",{obj:"bar"},function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Object();
                        value.should.eql({obj:"bar"});
                        done();
                    });
                });
            });
        });

        it('should store array',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",["a","b","c"],function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Array();
                        value.should.eql(["a","b","c"]);
                        context.get("nodeX","foo[1]",function(err, value){
                            value.should.be.String();
                            value.should.equal("b");
                            done();
                        });
                    });
                });
            });
        });

        it('should store array of arrays',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",[["a","b","c"],[1,2,3,4],[true,false]],function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Array();
                        value.should.have.length(3);
                        value[0].should.have.length(3);
                        value[1].should.have.length(4);
                        value[2].should.have.length(2);
                        context.get("nodeX","foo[1]",function(err, value){
                            value.should.be.Array();
                            value.should.have.length(4);
                            value.should.be.eql([1,2,3,4]);
                            done();
                        });
                    });
                });
            });
        });

        it('should store array of objects',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",[{obj:"bar1"},{obj:"bar2"},{obj:"bar3"}],function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Array();
                        value.should.have.length(3);
                        value[0].should.be.Object();
                        value[1].should.be.Object();
                        value[2].should.be.Object();
                        context.get("nodeX","foo[1]",function(err, value){
                            value.should.be.Object();
                            value.should.be.eql({obj:"bar2"});
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('#keys',function() {
        it('should enumerate context keys', function(done) {
            context.keys("nodeX",function(err, value){
                value.should.be.an.Array();
                value.should.be.empty();
                context.set("nodeX","foo","bar",function(err){
                    context.keys("nodeX",function(err, value){
                        value.should.have.length(1);
                        value[0].should.equal("foo");
                        context.set("nodeX","abc.def","bar",function(err){
                            context.keys("nodeX",function(err, value){
                                value.should.have.length(2);
                                value[1].should.equal("abc");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should enumerate context keys in each scopes', function(done) {
            context.keys("nodeX",function(err, value){
                value.should.be.an.Array();
                value.should.be.empty();
                context.keys("nodeY",function(err, value){
                    value.should.be.an.Array();
                    value.should.be.empty();
                    context.set("nodeX","foo","bar",function(err){
                        context.set("nodeY","hoge","piyo",function(err){
                            context.keys("nodeX",function(err, value){
                                value.should.have.length(1);
                                value[0].should.equal("foo");
                                context.keys("nodeY",function(err, value){
                                    value.should.have.length(1);
                                    value[0].should.equal("hoge");
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
        it('should delete context',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.get("nodeY","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","testX",function(err){
                        context.set("nodeY","foo","testY",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.equal("testX");
                                context.get("nodeY","foo",function(err, value){
                                    value.should.be.equal("testY");
                                    context.delete("nodeX").then(function(){
                                        context.get("nodeX","foo",function(err, value){
                                            should.not.exist(value);
                                            context.get("nodeY","foo",function(err, value){
                                                value.should.be.equal("testY");
                                                done();
                                            });
                                        });
                                    }).catch(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#clean',function() {
        it('should clean unnecessary context',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.get("nodeY","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","testX",function(err){
                        context.set("nodeY","foo","testY",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.equal("testX");
                                context.get("nodeY","foo",function(err, value){
                                    value.should.be.equal("testY");
                                    context.clean([]).then(function(){
                                        context.get("nodeX","foo",function(err, value){
                                            should.not.exist(value);
                                            context.get("nodeY","foo",function(err, value){
                                                should.not.exist(value);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should not clean active context',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.get("nodeY","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","testX",function(err){
                        context.set("nodeY","foo","testY",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.equal("testX");
                                context.get("nodeY","foo",function(err, value){
                                    value.should.be.equal("testY");
                                    context.clean(["nodeX"]).then(function(){
                                        context.get("nodeX","foo",function(err, value){
                                            value.should.be.equal("testX");
                                            context.get("nodeY","foo",function(err, value){
                                                should.not.exist(value);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
