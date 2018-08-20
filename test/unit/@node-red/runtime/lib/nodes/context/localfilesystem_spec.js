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
var NR_TEST_UTILS = require("nr-test-utils");
var LocalFileSystem =  NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/context/localfilesystem");

var resourcesDir = path.resolve(path.join(__dirname,"..","resources","context"));

var defaultContextBase = "context";

describe('localfilesystem',function() {

    before(function() {
        return fs.remove(resourcesDir);
    });

    describe('#get/set',function() {
        var context;
        beforeEach(function() {
            context = LocalFileSystem({dir: resourcesDir, cache: false});
            return context.open();
        });

        afterEach(function() {
            return context.clean([]).then(function(){
                return context.close();
            }).then(function(){
                return fs.remove(resourcesDir);
            });
        });

        it('should store property',function(done) {
            context.get("nodeX","foo",function(err, value){
                if (err) { return done(err); }
                should.not.exist(value);
                context.set("nodeX","foo","test",function(err){
                    if (err) { return done(err); }
                    context.get("nodeX","foo",function(err, value){
                        if (err) { return done(err); }
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

        it('should store local scope property', function (done) {
            context.set("abc:def", "foo.bar", "test", function (err) {
                context.get("abc:def", "foo", function (err, value) {
                    value.should.be.eql({ bar: "test" });
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
                                value.should.be.equal("testX");
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

        it('should set/get multiple values', function(done) {
            context.set("nodeX",["one","two","three"],["test1","test2","test3"], function(err) {
                context.get("nodeX",["one","two"], function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1","test2"])
                    done();
                });
            });
        })
        it('should set/get multiple values - get unknown', function(done) {
            context.set("nodeX",["one","two","three"],["test1","test2","test3"], function(err) {
                context.get("nodeX",["one","two","unknown"], function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1","test2",undefined])
                    done();
                });
            });
        })
        it('should set/get multiple values - single value providd', function(done) {
            context.set("nodeX",["one","two","three"],"test1", function(err) {
                context.get("nodeX",["one","two"], function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1",null])
                    done();
                });
            });
        })

        it('should throw error if bad key included in multiple keys - get', function(done) {
            context.set("nodeX",["one","two","three"],["test1","test2","test3"], function(err) {
                context.get("nodeX",["one",".foo","three"], function(err) {
                    should.exist(err);
                    done();
                });
            });
        })

        it('should throw error if bad key included in multiple keys - set', function(done) {
            context.set("nodeX",["one",".foo","three"],["test1","test2","test3"], function(err) {
                should.exist(err);
                // Check 'one' didn't get set as a result
                context.get("nodeX","one",function(err,one) {
                    should.not.exist(one);
                    done();
                })
            });
        })

        it('should throw an error when getting a value with invalid key', function (done) {
            context.set("nodeX","foo","bar",function(err) {
                context.get("nodeX"," ",function(err,value) {
                    should.exist(err);
                    done();
                });
            });
        });

        it('should throw an error when setting a value with invalid key',function (done) {
            context.set("nodeX"," ","bar",function (err) {
                should.exist(err);
                done();
            });
        });

        it('should throw an error when callback of get() is not a function',function (done) {
            try {
                context.get("nodeX","foo","callback");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should throw an error when callback of get() is not specified',function (done) {
            try {
                context.get("nodeX","foo");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should throw an error when callback of set() is not a function',function (done) {
            try {
                context.set("nodeX","foo","bar","callback");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should not throw an error when callback of set() is not specified', function (done) {
            try {
                context.set("nodeX"," ","bar");
                done();
            } catch (err) {
                done("should not throw an error.");
            }
        });

        it('should handle empty context file', function (done) {
            fs.outputFile(path.join(resourcesDir,defaultContextBase,"nodeX","flow.json"),"",function(){
                context.get("nodeX", "foo", function (err, value) {
                    should.not.exist(value);
                    context.set("nodeX", "foo", "test", function (err) {
                        context.get("nodeX", "foo", function (err, value) {
                            value.should.be.equal("test");
                            done();
                        });
                    });
                });
            });
        });

        it('should throw an error when reading corrupt context file', function (done) {
            fs.outputFile(path.join(resourcesDir, defaultContextBase, "nodeX", "flow.json"),"{abc",function(){
                context.get("nodeX", "foo", function (err, value) {
                    should.exist(err);
                    done();
                });
            });
        });
    });

    describe('#keys',function() {
        var context;
        beforeEach(function() {
            context = LocalFileSystem({dir: resourcesDir, cache: false});
            return context.open();
        });

        afterEach(function() {
            return context.clean([]).then(function(){
                return context.close();
            }).then(function(){
                return fs.remove(resourcesDir);
            });
        });

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

        it('should throw an error when callback of keys() is not a function', function (done) {
            try {
                context.keys("nodeX", "callback");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should throw an error when callback of keys() is not specified', function (done) {
            try {
                context.keys("nodeX");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });
    });

    describe('#delete',function() {
        var context;
        beforeEach(function() {
            context = LocalFileSystem({dir: resourcesDir, cache: false});
            return context.open();
        });

        afterEach(function() {
            return context.clean([]).then(function(){
                return context.close();
            }).then(function(){
                return fs.remove(resourcesDir);
            });
        });

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
        var context;
        var contextGet;
        var contextSet;
        beforeEach(function() {
            context = LocalFileSystem({dir: resourcesDir, cache: false});
            contextGet = function(scope,key) {
                return new Promise((res,rej) => {
                    context.get(scope,key, function(err,value) {
                        if (err) {
                            rej(err);
                        } else {
                            res(value);
                        }
                    })
                });
            }
            contextSet = function(scope,key,value) {
                return new Promise((res,rej) => {
                    context.set(scope,key,value, function(err) {
                        if (err) {
                            rej(err);
                        } else {
                            res();
                        }
                    })
                });
            }
            return context.open();
        });

        afterEach(function() {
            return context.clean([]).then(function(){
                return context.close().then(function(){
                    return fs.remove(resourcesDir);
                });
            });
        });
        it('should clean unnecessary context',function(done) {
            contextSet("global","foo","testGlobal").then(function() {
                return contextSet("nodeX:flow1","foo","testX");
            }).then(function() {
                return contextSet("nodeY:flow2","foo","testY");
            }).then(function() {
                return contextGet("nodeX:flow1","foo");
            }).then(function(value) {
                value.should.be.equal("testX");
            }).then(function() {
                return contextGet("nodeY:flow2","foo");
            }).then(function(value) {
                value.should.be.equal("testY");
            }).then(function() {
                return context.clean([])
            }).then(function() {
                return contextGet("nodeX:flow1","foo");
            }).then(function(value) {
                should.not.exist(value);
            }).then(function() {
                return contextGet("nodeY:flow2","foo");
            }).then(function(value) {
                should.not.exist(value);
            }).then(function() {
                return contextGet("global","foo");
            }).then(function(value) {
                value.should.eql("testGlobal");
            }).then(done).catch(done);
        });

        it('should not clean active context',function(done) {
            contextSet("global","foo","testGlobal").then(function() {
                return contextSet("nodeX:flow1","foo","testX");
            }).then(function() {
                return contextSet("nodeY:flow2","foo","testY");
            }).then(function() {
                return contextGet("nodeX:flow1","foo");
            }).then(function(value) {
                value.should.be.equal("testX");
            }).then(function() {
                return contextGet("nodeY:flow2","foo");
            }).then(function(value) {
                value.should.be.equal("testY");
            }).then(function() {
                return context.clean(["flow1","nodeX"])
            }).then(function() {
                return contextGet("nodeX:flow1","foo");
            }).then(function(value) {
                value.should.be.equal("testX");
            }).then(function() {
                return contextGet("nodeY:flow2","foo");
            }).then(function(value) {
                should.not.exist(value);
            }).then(function() {
                return contextGet("global","foo");
            }).then(function(value) {
                value.should.eql("testGlobal");
            }).then(done).catch(done);
        });
    });

    describe('#if cache is enabled',function() {

        var context;
        beforeEach(function() {
            context = LocalFileSystem({dir: resourcesDir, cache: false});
            return context.open();
        });

        afterEach(function() {
            return context.clean([]).then(function(){
                return context.close();
            }).then(function(){
                return fs.remove(resourcesDir);
            });
        });



        it('should load contexts into the cache',function() {
            var globalData = {key:"global"};
            var flowData = {key:"flow"};
            var nodeData = {key:"node"};
            return Promise.all([
                fs.outputFile(path.join(resourcesDir,defaultContextBase,"global","global.json"), JSON.stringify(globalData,null,4), "utf8"),
                fs.outputFile(path.join(resourcesDir,defaultContextBase,"flow","flow.json"), JSON.stringify(flowData,null,4), "utf8"),
                fs.outputFile(path.join(resourcesDir,defaultContextBase,"flow","node.json"), JSON.stringify(nodeData,null,4), "utf8")
            ]).then(function(){
                context = LocalFileSystem({dir: resourcesDir, cache: true});
                return context.open();
            }).then(function(){
                return Promise.all([
                    fs.remove(path.join(resourcesDir,defaultContextBase,"global","global.json")),
                    fs.remove(path.join(resourcesDir,defaultContextBase,"flow","flow.json")),
                    fs.remove(path.join(resourcesDir,defaultContextBase,"flow","node.json"))
                ]);
            }).then(function(){
                context.get("global","key").should.be.equal("global");
                context.get("flow","key").should.be.equal("flow");
                context.get("node:flow","key").should.be.equal("node");
            });
        });

        it('should store property to the cache',function() {
            context = LocalFileSystem({dir: resourcesDir, cache: true, flushInterval: 1});
            return context.open().then(function(){
                return new Promise(function(resolve, reject){
                    context.set("global","foo","bar",function(err){
                        if(err){
                            reject(err);
                        } else {
                            fs.readJson(path.join(resourcesDir,defaultContextBase,"global","global.json")).then(function(data) {
                                // File should not exist as flush hasn't happened
                                reject("File global/global.json should not exist");
                            }).catch(function(err) {
                                setTimeout(function() {
                                    fs.readJson(path.join(resourcesDir,defaultContextBase,"global","global.json")).then(function(data) {
                                        data.should.eql({foo:'bar'});
                                        resolve();
                                    }).catch(function(err) {
                                        reject(err);
                                    });
                                },1100)
                            })
                        }
                    });
                });
            }).then(function(){
                return fs.remove(path.join(resourcesDir,defaultContextBase,"global","global.json"));
            }).then(function(){
                context.get("global","foo").should.be.equal("bar");
            })
        });

        it('should enumerate context keys in the cache',function() {
            var globalData = {foo:"bar"};
            return fs.outputFile(path.join(resourcesDir,defaultContextBase,"global","global.json"), JSON.stringify(globalData,null,4), "utf8").then(function(){
                context = LocalFileSystem({dir: resourcesDir, cache: true, flushInterval: 2});
                return context.open()
            }).then(function(){
                return fs.remove(path.join(resourcesDir,defaultContextBase,"global","global.json"));
            }).then(function(){
                var keys = context.keys("global");
                keys.should.have.length(1);
                keys[0].should.equal("foo");
                return new Promise(function(resolve, reject){
                    context.set("global","foo2","bar2",function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }).then(function(){
                return fs.remove(path.join(resourcesDir,defaultContextBase,"global","global.json"));
            }).then(function(){
                var keys = context.keys("global");
                keys.should.have.length(2);
                keys[1].should.equal("foo2");
            })
        });

        it('should delete context in the cache',function() {
            context = LocalFileSystem({dir: resourcesDir, cache: true, flushInterval: 2});
            return context.open().then(function(){
                return new Promise(function(resolve, reject){
                    context.set("global","foo","bar",function(err){
                        if(err){
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }).then(function(){
                context.get("global","foo").should.be.equal("bar");
                return context.delete("global");
            }).then(function(){
                should.not.exist(context.get("global","foo"))
            })
        });

        it('should clean unnecessary context in the cache',function() {
            var flowAData = {key:"flowA"};
            var flowBData = {key:"flowB"};
            return Promise.all([
                fs.outputFile(path.join(resourcesDir,defaultContextBase,"flowA","flow.json"), JSON.stringify(flowAData,null,4), "utf8"),
                fs.outputFile(path.join(resourcesDir,defaultContextBase,"flowB","flow.json"), JSON.stringify(flowBData,null,4), "utf8")
            ]).then(function(){
                context = LocalFileSystem({dir: resourcesDir, cache: true, flushInterval: 2});
                return context.open();
            }).then(function(){
                context.get("flowA","key").should.be.equal("flowA");
                context.get("flowB","key").should.be.equal("flowB");
                return context.clean(["flowA"]);
            }).then(function(){
                context.get("flowA","key").should.be.equal("flowA");
                should.not.exist(context.get("flowB","key"));
            });
        });
    });

    describe('Configuration', function () {
        var context;
        beforeEach(function() {
            context = LocalFileSystem({dir: resourcesDir, cache: false});
            return context.open();
        });

        afterEach(function() {
            return context.clean([]).then(function(){
                return context.close();
            }).then(function(){
                return fs.remove(resourcesDir);
            });
        });
        it('should change a base directory', function (done) {
            var differentBaseContext = LocalFileSystem({
                base: "contexts2",
                dir: resourcesDir,
                cache: false
            });
            differentBaseContext.open().then(function () {
                differentBaseContext.set("node2", "foo2", "bar2", function (err) {
                    differentBaseContext.get("node2", "foo2", function (err, value) {
                        value.should.be.equal("bar2");
                        context.get("node2", "foo2", function(err, value) {
                            should.not.exist(value);
                            done();
                        });
                    });
                });
            });
        });

        it('should use userDir', function (done) {
            var userDirContext = LocalFileSystem({
                base: "contexts2",
                cache: false,
                settings: {
                    userDir: resourcesDir
                }
            });
            userDirContext.open().then(function () {
                userDirContext.set("node2", "foo2", "bar2", function (err) {
                    userDirContext.get("node2", "foo2", function (err, value) {
                        value.should.be.equal("bar2");
                        context.get("node2", "foo2", function (err, value) {
                            should.not.exist(value);
                            done();
                        });
                    });
                });
            });
        });

        it('should use NODE_RED_HOME', function (done) {
            var oldNRH = process.env.NODE_RED_HOME;
            process.env.NODE_RED_HOME = resourcesDir;
            fs.ensureDirSync(resourcesDir);
            fs.writeFileSync(path.join(resourcesDir,".config.json"),"");
            var nrHomeContext = LocalFileSystem({
                base: "contexts2",
                cache: false
            });
            try {
                nrHomeContext.open().then(function () {
                    nrHomeContext.set("node2", "foo2", "bar2", function (err) {
                        nrHomeContext.get("node2", "foo2", function (err, value) {
                            value.should.be.equal("bar2");
                            context.get("node2", "foo2", function (err, value) {
                                should.not.exist(value);
                                done();
                            });
                        });
                    });
                });
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
            }
        });

        it('should use HOME_PATH', function (done) {
            var oldNRH = process.env.NODE_RED_HOME;
            var oldHOMEPATH = process.env.HOMEPATH;
            process.env.NODE_RED_HOME = resourcesDir;
            process.env.HOMEPATH = resourcesDir;
            var homePath = path.join(resourcesDir, ".node-red");
            fs.outputFile(path.join(homePath, ".config.json"),"",function(){
                var homeContext = LocalFileSystem({
                    base: "contexts2",
                    cache: false
                });
                try {
                    homeContext.open().then(function () {
                        homeContext.set("node2", "foo2", "bar2", function (err) {
                            homeContext.get("node2", "foo2", function (err, value) {
                                value.should.be.equal("bar2");
                                context.get("node2", "foo2", function (err, value) {
                                    should.not.exist(value);
                                    done();
                                });
                            });
                        });
                    });
                } finally {
                    process.env.NODE_RED_HOME = oldNRH;
                    process.env.HOMEPATH = oldHOMEPATH;
                }
            });
        });

        it('should use HOME_PATH', function (done) {
            var oldNRH = process.env.NODE_RED_HOME;
            var oldHOMEPATH = process.env.HOMEPATH;
            var oldHOME = process.env.HOME;
            process.env.NODE_RED_HOME = resourcesDir;
            process.env.HOMEPATH = resourcesDir;
            process.env.HOME = resourcesDir;
            var homeContext = LocalFileSystem({
                base: "contexts2",
                cache: false
            });
            try {
                homeContext.open().then(function () {
                    homeContext.set("node2", "foo2", "bar2", function (err) {
                        homeContext.get("node2", "foo2", function (err, value) {
                            value.should.be.equal("bar2");
                            context.get("node2", "foo2", function (err, value) {
                                should.not.exist(value);
                                done();
                            });
                        });
                    });
                });
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
                process.env.HOMEPATH = oldHOMEPATH;
                process.env.HOME = oldHOME;
            }
        });
    });
});
