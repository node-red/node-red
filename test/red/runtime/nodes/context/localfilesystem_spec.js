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

    beforeEach(function() {
        context = LocalFileSystem({dir: resourcesDir});
        return context.open();
    });

    afterEach(function() {
        return context.clean([]).then(function(){
            return context.close().then(function(){
                return fs.remove(resourcesDir);
            });
        });
    });

    describe('#getAsync/setAsync',function() {
        it('should store property',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo","test");
            }).then(function(){
                return context.getAsync("nodeX","foo").should.be.finally.equal("test");
            });
        });

        it('should store property - creates parent properties',function() {
            return context.setAsync("nodeX","foo.bar","test").then(function(){
                return context.getAsync("nodeX","foo").should.be.finally.eql({bar:"test"});
            });
        });

        it('should delete property',function() {
            return context.setAsync("nodeX","foo.abc.bar1","test1")
            .then(function(){
                return context.setAsync("nodeX","foo.abc.bar2","test2")
            }).then(function(){
                return context.getAsync("nodeX","foo.abc").should.be.finally.eql({bar1:"test1",bar2:"test2"});
            }).then(function(){
                return context.setAsync("nodeX","foo.abc.bar1",undefined).then(function(){
                   return context.getAsync("nodeX","foo.abc").should.be.finally.eql({bar2:"test2"});
                });
            }).then(function(){
                return context.setAsync("nodeX","foo.abc",undefined).then(function(){
                    return context.getAsync("nodeX","foo.abc").should.be.finally.undefined();
                });
            }).then(function(){
                return context.setAsync("nodeX","foo",undefined).then(function(){
                    return context.getAsync("nodeX","foo").should.be.finally.undefined();
                });
            });
        });

        it('should not shared context with other scope', function() {
            return Promise.all([context.getAsync("nodeX","foo").should.be.finally.undefined(),
                                context.getAsync("nodeY","foo").should.be.finally.undefined()
            ]).then(function(){
                return Promise.all([context.setAsync("nodeX","foo","testX"),
                                    context.setAsync("nodeY","foo","testY")])
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.equal("testX"),
                                    context.getAsync("nodeY","foo").should.be.finally.equal("testY")]);
            });
        });

        it('should store string',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo","bar");
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.String();
                result.should.be.equal("bar");
            }).then(function(){
                return context.setAsync("nodeX","foo","1");
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.String();
                result.should.be.equal("1");
            });
        });

        it('should store number',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",1);
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.Number();
                result.should.be.equal(1);
            });
        });

        it('should store null',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",null);
            }).then(function(){
                return context.getAsync("nodeX","foo").should.be.finally.null();
            });
        });

        it('should store boolean',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",true);
            }).then(function(){
                return context.getAsync("nodeX","foo").should.be.finally.Boolean().and.true();
            }).then(function(){
                return context.setAsync("nodeX","foo",false);
            }).then(function(){
                return context.getAsync("nodeX","foo").should.be.finally.Boolean().and.false();
            });
        });

        it('should store object',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",{obj:"bar"});
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.Object();
                result.should.eql({obj:"bar"});
            });
        });

        it('should store array',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",["a","b","c"]);
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.Array();
                result.should.eql(["a","b","c"]);
            }).then(function(){
                return context.getAsync("nodeX","foo[1]")
            }).then(function(result){
                result.should.be.String();
                result.should.equal("b");
            });
        });

        it('should store array of arrays',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",[["a","b","c"],[1,2,3,4],[true,false]]);
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.Array();
                result.should.have.length(3);
                result[0].should.have.length(3);
                result[1].should.have.length(4);
                result[2].should.have.length(2);
            }).then(function(){
                return context.getAsync("nodeX","foo[1]")
            }).then(function(result){
                result.should.be.Array();
                result.should.have.length(4);
                result.should.be.eql([1,2,3,4]);
            });
        });

        it('should store array of objects',function() {
            return context.getAsync("nodeX","foo").should.be.finally.undefined()
            .then(function(){
                return context.setAsync("nodeX","foo",[{obj:"bar1"},{obj:"bar2"},{obj:"bar3"}]);
            }).then(function(){
                return context.getAsync("nodeX","foo")
            }).then(function(result){
                result.should.be.Array();
                result.should.have.length(3);
                result[0].should.be.Object();
                result[1].should.be.Object();
                result[2].should.be.Object();
            }).then(function(){
                return context.getAsync("nodeX","foo[1]")
            }).then(function(result){
                result.should.be.Object();
                result.should.be.eql({obj:"bar2"});
            });
        });
    });

    describe('#keysAsync',function() {
        it('should enumerate context keys', function() {
            return context.keysAsync("nodeX").then(function(result){
                result.should.be.an.Array();
                result.should.be.empty();
            }).then(function(){
                return context.setAsync("nodeX","foo","bar");
            }).then(function(){
                return context.keysAsync("nodeX").then(function(result){
                    result.should.have.length(1);
                    result[0].should.equal("foo");
                });
            }).then(function(){
                return context.setAsync("nodeX","abc.def","bar");
            }).then(function(){
                return context.keysAsync("nodeX").then(function(result){
                    result.should.have.length(2);
                    result[1].should.equal("abc");
                });
            });
        });

        it('should enumerate context keys in each scopes', function() {
            return Promise.all([context.keysAsync("nodeX"),
                                context.keysAsync("nodeY")
            ]).then(function(results){
                results[0].should.be.an.Array();
                results[0].should.be.empty();
                results[1].should.be.an.Array();
                results[1].should.be.empty();
            }).then(function(){
                return Promise.all([context.setAsync("nodeX","foo","bar"),
                                    context.setAsync("nodeY","hoge","piyo")]);
            }).then(function(){
                return Promise.all([context.keysAsync("nodeX"),
                                    context.keysAsync("nodeY")]);
            }).then(function(results){
                results[0].should.have.length(1);
                results[0][0].should.equal("foo");
                results[1].should.have.length(1);
                results[1][0].should.equal("hoge");
            });
        });
    });

    describe('#delete',function() {
        it('should delete context',function() {
            return Promise.all([context.getAsync("nodeX","foo").should.be.finally.undefined(),
                                context.getAsync("nodeY","foo").should.be.finally.undefined()
            ]).then(function(){
                return Promise.all([context.setAsync("nodeX","foo","abc"),
                                    context.setAsync("nodeY","foo","abc")]);
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.equal("abc"),
                                    context.getAsync("nodeY","foo").should.be.finally.equal("abc")])
            }).then(function(){
                return context.delete("nodeX");
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.undefined(),
                                    context.getAsync("nodeY","foo").should.be.finally.equal("abc")]);
            });
        });
    });

    describe('#clean',function() {
        it('should clean unnecessary context',function() {
            return Promise.all([context.getAsync("nodeX","foo").should.be.finally.undefined(),
                                context.getAsync("nodeY","foo").should.be.finally.undefined()
            ]).then(function(){
                return Promise.all([context.setAsync("nodeX","foo","abc"),
                                    context.setAsync("nodeY","foo","abc")]);
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.equal("abc"),
                                    context.getAsync("nodeY","foo").should.be.finally.equal("abc")])
            }).then(function(){
                return context.clean([]);
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.undefined(),
                                    context.getAsync("nodeY","foo").should.be.finally.undefined()]);
            });
        });

        it('should not clean active context',function() {
            return Promise.all([context.getAsync("nodeX","foo").should.be.finally.undefined(),
                                context.getAsync("nodeY","foo").should.be.finally.undefined()
            ]).then(function(){
                return Promise.all([context.setAsync("nodeX","foo","abc"),
                                    context.setAsync("nodeY","foo","abc")]);
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.equal("abc"),
                                    context.getAsync("nodeY","foo").should.be.finally.equal("abc")])
            }).then(function(){
                return context.clean(["nodeX"]);
            }).then(function(){
                return Promise.all([context.getAsync("nodeX","foo").should.be.finally.equal("abc"),
                                    context.getAsync("nodeY","foo").should.be.finally.undefined()]);
            });
        });
    });
});