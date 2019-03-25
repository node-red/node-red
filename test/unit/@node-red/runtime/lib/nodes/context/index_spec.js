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
var sinon = require('sinon');
var path = require("path");
var fs = require('fs-extra');
var NR_TEST_UTILS = require("nr-test-utils");
var Context = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/context/index");

describe('context', function() {
    describe('local memory',function() {
        beforeEach(function() {
            Context.init({});
            Context.load();
        });
        afterEach(function() {
            Context.clean({allNodes:{}});
            return Context.close();
        });
        it('stores local property',function() {
            var context1 = Context.get("1","flowA");
            should.not.exist(context1.get("foo"));
            context1.set("foo","test");
            context1.get("foo").should.equal("test");
        });
        it('stores local property - creates parent properties',function() {
            var context1 = Context.get("1","flowA");
            context1.set("foo.bar","test");
            context1.get("foo").should.eql({bar:"test"});
        });
        it('deletes local property',function() {
            var context1 = Context.get("1","flowA");
            context1.set("foo.abc.bar1","test1");
            context1.set("foo.abc.bar2","test2");
            context1.get("foo.abc").should.eql({bar1:"test1",bar2:"test2"});
            context1.set("foo.abc.bar1",undefined);
            context1.get("foo.abc").should.eql({bar2:"test2"});
            context1.set("foo.abc",undefined);
            should.not.exist(context1.get("foo.abc"));
            context1.set("foo",undefined);
            should.not.exist(context1.get("foo"));
        });
        it('stores flow property',function() {
            var context1 = Context.get("1","flowA");
            should.not.exist(context1.flow.get("foo"));
            context1.flow.set("foo","test");
            context1.flow.get("foo").should.equal("test");
        });
        it('stores global property',function() {
            var context1 = Context.get("1","flowA");
            should.not.exist(context1.global.get("foo"));
            context1.global.set("foo","test");
            context1.global.get("foo").should.equal("test");
        });

        it('keeps local context local', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowA");

            should.not.exist(context1.get("foo"));
            should.not.exist(context2.get("foo"));
            context1.set("foo","test");

            context1.get("foo").should.equal("test");
            should.not.exist(context2.get("foo"));
        });
        it('flow context accessible to all flow nodes', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowA");

            should.not.exist(context1.flow.get("foo"));
            should.not.exist(context2.flow.get("foo"));

            context1.flow.set("foo","test");
            context1.flow.get("foo").should.equal("test");
            context2.flow.get("foo").should.equal("test");
        });

        it('flow context not shared to nodes on other flows', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowB");

            should.not.exist(context1.flow.get("foo"));
            should.not.exist(context2.flow.get("foo"));

            context1.flow.set("foo","test");
            context1.flow.get("foo").should.equal("test");
            should.not.exist(context2.flow.get("foo"));
        });

        it('global context shared to all nodes', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowB");

            should.not.exist(context1.global.get("foo"));
            should.not.exist(context2.global.get("foo"));

            context1.global.set("foo","test");
            context1.global.get("foo").should.equal("test");
            context2.global.get("foo").should.equal("test");
        });

        it('context.flow/global are not enumerable', function() {
            var context1 = Context.get("1","flowA");
            Object.keys(context1).length.should.equal(0);
            Object.keys(context1.flow).length.should.equal(0);
            Object.keys(context1.global).length.should.equal(0);
        })

        it('context.flow/global cannot be deleted', function() {
            var context1 = Context.get("1","flowA");
            delete context1.flow;
            should.exist(context1.flow);
            delete context1.global;
            should.exist(context1.global);
        })

        it('deletes context',function() {
            var context = Context.get("1","flowA");
            should.not.exist(context.get("foo"));
            context.set("foo","abc");
            context.get("foo").should.equal("abc");

            return Context.delete("1","flowA").then(function(){
                context = Context.get("1","flowA");
                should.not.exist(context.get("foo"));
            });
        });

        it('enumerates context keys - sync', function() {
            var context = Context.get("1","flowA");

            var keys = context.keys();
            keys.should.be.an.Array();
            keys.should.be.empty();

            context.set("foo","bar");
            keys = context.keys();
            keys.should.have.length(1);
            keys[0].should.equal("foo");

            context.set("abc.def","bar");
            keys = context.keys();
            keys.should.have.length(2);
            keys[1].should.equal("abc");
        });

        it('enumerates context keys - async', function(done) {
            var context = Context.get("1","flowA");

            var keys = context.keys(function(err,keys) {
                keys.should.be.an.Array();
                keys.should.be.empty();
                context.set("foo","bar");
                keys = context.keys(function(err,keys) {
                    keys.should.have.length(1);
                    keys[0].should.equal("foo");

                    context.set("abc.def","bar");
                    keys = context.keys(function(err,keys) {
                        keys.should.have.length(2);
                        keys[1].should.equal("abc");
                        done();
                    });
                });
            });
        });

        it('should enumerate only context keys when GlobalContext was given - sync', function() {
            Context.init({functionGlobalContext: {foo:"bar"}});
            Context.load().then(function(){
                var context = Context.get("1","flowA");
                context.global.set("foo2","bar2");
                var keys = context.global.keys();
                keys.should.have.length(2);
                keys[0].should.equal("foo");
                keys[1].should.equal("foo2");
            });
        });

        it('should enumerate only context keys when GlobalContext was given - async', function(done) {
            Context.init({functionGlobalContext: {foo:"bar"}});
            Context.load().then(function(){
                var context = Context.get("1","flowA");
                context.global.set("foo2","bar2");
                context.global.keys(function(err,keys) {
                    keys.should.have.length(2);
                    keys[0].should.equal("foo");
                    keys[1].should.equal("foo2");
                    done();
                });
            }).catch(done);
        });


        it('returns functionGlobalContext value if store value undefined', function() {
            Context.init({functionGlobalContext: {foo:"bar"}});
            return Context.load().then(function(){
                var context = Context.get("1","flowA");
                var v = context.global.get('foo');
                v.should.equal('bar');
            });
        })

        it('returns functionGlobalContext sub-value if store value undefined', function() {
            Context.init({functionGlobalContext: {foo:{bar:123}}});
            return Context.load().then(function(){
                var context = Context.get("1","flowA");
                var v = context.global.get('foo.bar');
                should.equal(v,123);
            });
        })

        describe("$parent", function() {
            it('should get undefined for $parent without key', function() {
                var context0 = Context.get("0","flowA");
                var context1 = Context.get("1","flowB", context0);
                var parent = context1.get("$parent");
                should.equal(parent, undefined);
            });

            it('should get undefined for $parent of root', function() {
                var context0 = Context.get("0","flowA");
                var context1 = Context.get("1","flowB", context0);
                var parent = context1.get("$parent.$parent.K");
                should.equal(parent, undefined);
            });

            it('should get value in $parent', function() {
                var context0 = Context.get("0","flowA");
                var context1 = Context.get("1","flowB", context0);
                context0.set("K", "v");
                var v = context1.get("$parent.K");
                should.equal(v, "v");
            });

            it('should set value in $parent', function() {
                var context0 = Context.get("0","flowA");
                var context1 = Context.get("1","flowB", context0);
                context1.set("$parent.K", "v");
                var v = context0.get("K");
                should.equal(v, "v");
            });

            it('should not contain $parent in keys', function() {
                var context0 = Context.get("0","flowA");
                var context1 = Context.get("1","flowB", context0);
                var parent = context1.get("$parent");
                context0.set("K0", "v0");
                context1.set("K1", "v1");
                var keys = context1.keys();
                keys.should.have.length(1);
                keys[0].should.equal("K1");
            });
        });

    });

    describe('external context storage',function() {
        var resourcesDir = path.resolve(path.join(__dirname,"..","resources","context"));
        var sandbox = sinon.sandbox.create();
        var stubGet = sandbox.stub();
        var stubSet = sandbox.stub();
        var stubKeys = sandbox.stub();
        var stubDelete = sandbox.stub().returns(Promise.resolve());
        var stubClean = sandbox.stub().returns(Promise.resolve());
        var stubOpen = sandbox.stub().returns(Promise.resolve());
        var stubClose = sandbox.stub().returns(Promise.resolve());
        var stubGet2 = sandbox.stub();
        var stubSet2 = sandbox.stub();
        var stubKeys2 = sandbox.stub();
        var stubDelete2 = sandbox.stub().returns(Promise.resolve());
        var stubClean2 = sandbox.stub().returns(Promise.resolve());
        var stubOpen2 = sandbox.stub().returns(Promise.resolve());
        var stubClose2 = sandbox.stub().returns(Promise.resolve());
        var testPlugin = function(config){
            function Test(){}
            Test.prototype.get = stubGet;
            Test.prototype.set = stubSet;
            Test.prototype.keys = stubKeys;
            Test.prototype.delete = stubDelete;
            Test.prototype.clean = stubClean;
            Test.prototype.open = stubOpen;
            Test.prototype.close = stubClose;
            return new Test(config);
        };
        var testPlugin2 = function(config){
            function Test2(){}
            Test2.prototype.get = stubGet2;
            Test2.prototype.set = stubSet2;
            Test2.prototype.keys = stubKeys2;
            Test2.prototype.delete = stubDelete2;
            Test2.prototype.clean = stubClean2;
            Test2.prototype.open = stubOpen2;
            Test2.prototype.close = stubClose2;
            return new Test2(config);
        };
        var contextStorage={
            test:{
                module: testPlugin,
                config:{}
            }
        };
        var contextDefaultStorage={
            default: {
                module: testPlugin2,
                config:{}
            },
            test:{
                module: testPlugin,
                config:{}
            }
        };
        var contextAlias={
            default: "test",
            test:{
                module: testPlugin,
                config:{}
            }
        };
        var memoryStorage ={
            memory:{
                module: "memory"
            }
        };

        afterEach(function() {
            sandbox.reset();
            return Context.clean({allNodes:{}}).then(function(){
                return Context.close();
            }).then(function(){
                return fs.remove(resourcesDir);
            });
        });

        describe('load modules',function(){
            it('should call open()', function() {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    stubOpen.called.should.be.true();
                    stubOpen2.called.should.be.true();
                });
            });
            it('should load memory module', function() {
                Context.init({contextStorage:{memory:{module:"memory"}}});
                return Context.load();
            });
            it('should load localfilesystem module', function() {
                Context.init({contextStorage:{file:{module:"localfilesystem",config:{dir:resourcesDir}}}});
                return Context.load();
            });
            it('should ignore reserved storage name `_`', function(done) {
                Context.init({contextStorage:{_:{module:testPlugin}}});
                Context.load().then(function(){
                    var context = Context.get("1","flow");
                    var cb = function(){}
                    context.set("foo","bar","_",cb);
                    context.get("foo","_",cb);
                    context.keys("_",cb);
                    stubSet.called.should.be.false();
                    stubGet.called.should.be.false();
                    stubKeys.called.should.be.false();
                    done();
                }).catch(done);
            });

            it('should fail when using invalid store name', function(done) {
                Context.init({contextStorage:{'Invalid name':{module:testPlugin}}});
                Context.load().then(function(){
                    done("An error was not thrown");
                }).catch(function(){
                    done();
                });
            });
            it('should fail when using invalid sign character', function (done) {
                Context.init({ contextStorage:{'abc-123':{module:testPlugin}}});
                Context.load().then(function () {
                    done("An error was not thrown");
                }).catch(function () {
                    done();
                });
            });
            it('should fail when using invalid default context', function(done) {
                Context.init({contextStorage:{default:"noexist"}});
                Context.load().then(function(){
                    done("An error was not thrown");
                }).catch(function(){
                    done();
                });
            });
            it('should fail for the storage with no module', function(done) {
                Context.init({ contextStorage: { test: {}}});
                Context.load().then(function(){
                    done("An error was not thrown");
                }).catch(function(){
                    done();
                });
            });
            it('should fail to load non-existent module', function(done) {
                Context.init({contextStorage:{ file:{module:"nonexistent"} }});
                Context.load().then(function(){
                    done("An error was not thrown");
                }).catch(function(){
                    done();
                });
            });
            it('should fail to load invalid module', function (done) {
                Context.init({contextStorage: {
                    test: {
                        module: function (config) {
                            throw new Error("invalid plugin was loaded.");
                        }
                    }
                }});
                Context.load().then(function () {
                    done("An error was not thrown");
                }).catch(function () {
                    done();
                });
            });
        });

        describe('close modules',function(){
            it('should call close()', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    return Context.close().then(function(){
                        stubClose.called.should.be.true();
                        stubClose2.called.should.be.true();
                        done();
                    });
                }).catch(done);
            });
        });

        describe('store context',function() {
            it('should store local property to external context storage',function(done) {
                Context.init({contextStorage:contextStorage});
                var cb = function(){done("An error occurred")}
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set("foo","bar","test",cb);
                    context.get("foo","test",cb);
                    context.keys("test",cb);
                    stubSet.calledWithExactly("1:flow","foo","bar",cb).should.be.true();
                    stubGet.calledWith("1:flow","foo").should.be.true();
                    stubKeys.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                }).catch(done);
            });
            it('should store flow property to external context storage',function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.flow.set("foo","bar","test",cb);
                    context.flow.get("foo","test",cb);
                    context.flow.keys("test",cb);
                    stubSet.calledWithExactly("flow","foo","bar",cb).should.be.true();
                    stubGet.calledWith("flow","foo").should.be.true();
                    stubKeys.calledWithExactly("flow",cb).should.be.true();
                    done();
                }).catch(done);
            });
            it('should store global property to external context storage',function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.global.set("foo","bar","test",cb);
                    context.global.get("foo","test",cb);
                    context.global.keys("test",cb);
                    stubSet.calledWithExactly("global","foo","bar",cb).should.be.true();
                    stubGet.calledWith("global","foo").should.be.true();
                    stubKeys.calledWith("global").should.be.true();
                    done();
                }).catch(done);
            });
            it('should store data to the default context when non-existent context storage was specified', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("foo","bar","nonexist",cb);
                    context.get("foo","nonexist",cb);
                    context.keys("nonexist",cb);
                    stubGet.called.should.be.false();
                    stubSet.called.should.be.false();
                    stubKeys.called.should.be.false();
                    stubSet2.calledWithExactly("1:flow","foo","bar",cb).should.be.true();
                    stubGet2.calledWith("1:flow","foo").should.be.true();
                    stubKeys2.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                }).catch(done);
            });
            it('should use the default context', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("foo","bar","default",cb);
                    context.get("foo","default",cb);
                    context.keys("default",cb);
                    stubGet.called.should.be.false();
                    stubSet.called.should.be.false();
                    stubKeys.called.should.be.false();
                    stubSet2.calledWithExactly("1:flow","foo","bar",cb).should.be.true();
                    stubGet2.calledWith("1:flow","foo").should.be.true();
                    stubKeys2.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                }).catch(done);
            });
            it('should use the alias of default context', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("foo","alias",cb);
                    context.get("foo",cb);
                    context.keys(cb);
                    stubGet.called.should.be.false();
                    stubSet.called.should.be.false();
                    stubKeys.called.should.be.false();
                    stubSet2.calledWithExactly("1:flow","foo","alias",cb).should.be.true();
                    stubGet2.calledWith("1:flow","foo").should.be.true();
                    stubKeys2.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                }).catch(done);
            });
            
            it('should allow the store name to be provide in the key', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("#:(test)::foo","bar");
                    context.get("#:(test)::foo");
                    stubGet2.called.should.be.false();
                    stubSet2.called.should.be.false();
                    stubSet.calledWithExactly("1:flow","foo","bar",undefined).should.be.true();
                    stubGet.calledWith("1:flow","foo").should.be.true();
                    done();
                }).catch(done);
            });


            it('should use default as the alias of other context', function(done) {
                Context.init({contextStorage:contextAlias});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("foo","alias",cb);
                    context.get("foo",cb);
                    context.keys(cb);
                    stubSet.calledWithExactly("1:flow","foo","alias",cb).should.be.true();
                    stubGet.calledWith("1:flow","foo").should.be.true();
                    stubKeys.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                }).catch(done);
            });
            it('should not throw an error using undefined storage for local context', function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.get("local","nonexist",cb);
                    done()
                }).catch(done);
            });
            it('should throw an error using undefined storage for flow context', function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.flow.get("flow","nonexist",cb);
                    done();
                }).catch(done);
            });

            it('should return functionGlobalContext value as a default - synchronous', function(done) {
                var fGC = { "foo": 456 };
                Context.init({contextStorage:memoryStorage, functionGlobalContext:fGC });
                Context.load().then(function() {
                    var context = Context.get("1","flow");
                    // Get foo - should be value from fGC
                    var v = context.global.get("foo");
                    v.should.equal(456);

                    // Update foo - should not touch fGC object
                    context.global.set("foo","new value");
                    fGC.foo.should.equal(456);

                    // Get foo - should be the updated value
                    v = context.global.get("foo");
                    v.should.equal("new value");
                    done();
                }).catch(done);
            })

            it('should return functionGlobalContext value as a default - async', function(done) {
                var fGC = { "foo": 456 };
                Context.init({contextStorage:memoryStorage, functionGlobalContext:fGC });
                Context.load().then(function() {
                    var context = Context.get("1","flow");
                    // Get foo - should be value from fGC
                    context.global.get("foo", function(err, v) {
                        if (err) {
                            done(err)
                        } else {
                            v.should.equal(456);
                            // Update foo - should not touch fGC object
                            context.global.set("foo","new value", function(err) {
                                if (err) {
                                    done(err)
                                } else {
                                    fGC.foo.should.equal(456);
                                    // Get foo - should be the updated value
                                    context.global.get("foo", function(err, v) {
                                        if (err) {
                                            done(err)
                                        } else {
                                            v.should.equal("new value");
                                            done();
                                        }
                                    });
                                }
                            });
                        }
                    });
                }).catch(done);
            })

            it('should return multiple values if key is an array', function(done) {
                Context.init({contextStorage:memoryStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set("foo1","bar1","memory");
                    context.set("foo2","bar2","memory");
                    context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                        if (err) {
                            done(err);
                        } else {
                            foo1.should.be.equal("bar1");
                            foo2.should.be.equal("bar2");
                            should.not.exist(foo3);
                            done();
                        }
                    });
                }).catch(function(err){ done(err); });
            });

            it('should return multiple functionGlobalContext values if key is an array', function(done) {
                var fGC = { "foo1": 456, "foo2": {"bar":789} };
                Context.init({contextStorage:memoryStorage, functionGlobalContext:fGC });
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.global.get(["foo1","foo2.bar","foo3"], "memory", function(err,foo1,foo2,foo3){
                        if (err) {
                            done(err);
                        } else {
                            should.equal(foo1, 456);
                            should.equal(foo2, 789);
                            should.not.exist(foo3);
                            done();
                        }
                    });
                }).catch(function(err){ done(err); });
            });

            it('should return an error if an error occurs in getting multiple store values', function(done) {
                Context.init({contextStorage:contextStorage});
                stubGet.onFirstCall().callsArgWith(2, "error2", "bar1");
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.global.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                        if (err === "error2") {
                            done();
                        } else {
                            done("An error occurred");
                        }
                    });
                }).catch(function(err){ done(err); });
            });

            it('should return a first error if some errors occur in getting multiple store values', function(done) {
                Context.init({contextStorage:contextStorage});
                stubGet.onFirstCall().callsArgWith(2, "error1");
                stubGet.onSecondCall().callsArgWith(2, null, "bar2");
                stubGet.onThirdCall().callsArgWith(2, "error3");
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                        if (err === "error1") {
                            done();
                        } else {
                            done("An error occurred");
                        }
                    });
                }).catch(function(err){ done(err); });
            });

            it('should store multiple properties if key and value are arrays', function(done) {
                Context.init({contextStorage:memoryStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set(["foo1","foo2","foo3"], ["bar1","bar2","bar3"], "memory", function(err){
                        if (err) {
                            done(err);
                        } else {
                            context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                                if (err) {
                                    done(err);
                                } else {
                                    foo1.should.be.equal("bar1");
                                    foo2.should.be.equal("bar2");
                                    foo3.should.be.equal("bar3");
                                    done();
                                }
                            });
                        }
                    });
                });
            });

            it('should deletes multiple properties', function(done) {
                Context.init({contextStorage:memoryStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set(["foo1","foo2","foo3"], ["bar1","bar2","bar3"], "memory", function(err){
                        if (err) {
                            done(err);
                        } else {
                            context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                                if (err) {
                                    done(err);
                                } else {
                                    foo1.should.be.equal("bar1");
                                    foo2.should.be.equal("bar2");
                                    foo3.should.be.equal("bar3");
                                    context.set(["foo1","foo2","foo3"], new Array(3), "memory", function(err){
                                        if (err) {
                                            done(err);
                                        } else {
                                            context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                                                if (err) {
                                                    done(err);
                                                } else {
                                                    should.not.exist(foo1);
                                                    should.not.exist(foo2);
                                                    should.not.exist(foo3);
                                                    done();
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            });

            it('should use null for missing values if the value array is shorter than the key array', function(done) {
                Context.init({contextStorage:memoryStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set(["foo1","foo2","foo3"], ["bar1","bar2"], "memory", function(err){
                        if (err) {
                            done(err);
                        } else {
                            context.keys(function(err, keys){
                                keys.should.have.length(3);
                                keys.should.eql(["foo1","foo2","foo3"]);
                                context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                                    if (err) {
                                        done(err);
                                    } else {
                                        foo1.should.be.equal("bar1");
                                        foo2.should.be.equal("bar2");
                                        should(foo3).be.null();
                                        done();
                                    }
                                });
                            });
                        }
                    });
                });
            });

            it('should use null for missing values if the value is not array', function(done) {
                Context.init({contextStorage:memoryStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set(["foo1","foo2","foo3"], "bar1", "memory", function(err){
                        if (err) {
                            done(err);
                        } else {
                            context.keys(function(err, keys){
                                keys.should.have.length(3);
                                keys.should.eql(["foo1","foo2","foo3"]);
                                context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                                    if (err) {
                                        done(err);
                                    } else {
                                        foo1.should.be.equal("bar1");
                                        should(foo2).be.null();
                                        should(foo3).be.null();
                                        done();
                                    }
                                });
                            });
                        }
                    });
                });
            });

            it('should ignore the extra values if the value array is longer than the key array', function(done) {
                Context.init({contextStorage:memoryStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set(["foo1","foo2","foo3"], ["bar1","bar2","bar3","ignored"], "memory", function(err){
                        if (err) {
                            done(err);
                        } else {
                            context.keys(function(err, keys){
                                keys.should.have.length(3);
                                keys.should.eql(["foo1","foo2","foo3"]);
                                context.get(["foo1","foo2","foo3"], "memory", function(err,foo1,foo2,foo3){
                                    if (err) {
                                        done(err);
                                    } else {
                                        foo1.should.be.equal("bar1");
                                        foo2.should.be.equal("bar2");
                                        foo3.should.be.equal("bar3");
                                        done();
                                    }
                                });
                            });
                        }
                    });
                });
            });

            it('should return an error if an error occurs in storing multiple values', function(done) {
                Context.init({contextStorage:contextStorage});
                stubSet.onFirstCall().callsArgWith(3, "error2");
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.set(["foo1","foo2","foo3"], ["bar1","bar2","bar3"], "memory", function(err){
                        if (err === "error2") {
                            done();
                        } else {
                            done("An error occurred");
                        }
                    });
                }).catch(function(err){ done(err); });
            });

            it('should throw an error if callback of context.get is not a function', function (done) {
                Context.init({ contextStorage: memoryStorage });
                Context.load().then(function () {
                    var context = Context.get("1", "flow");
                    context.get("foo", "memory", "callback");
                    done("should throw an error.");
                }).catch(function () {
                    done();
                });
            });

            it('should not throw an error if callback of context.get is not specified', function (done) {
                Context.init({ contextStorage: memoryStorage });
                Context.load().then(function () {
                    var context = Context.get("1", "flow");
                    context.get("foo", "memory");
                    done();
                }).catch(done);
            });

            it('should throw an error if callback of context.set is not a function', function (done) {
                Context.init({ contextStorage: memoryStorage });
                Context.load().then(function () {
                    var context = Context.get("1", "flow");
                    context.set("foo", "bar", "memory", "callback");
                    done("should throw an error.");
                }).catch(function () {
                    done();
                });
            });

            it('should not throw an error if callback of context.set is not specified', function (done) {
                Context.init({ contextStorage: memoryStorage });
                Context.load().then(function () {
                    var context = Context.get("1", "flow");
                    context.set("foo", "bar", "memory");
                    done();
                }).catch(done);
            });

            it('should throw an error if callback of context.keys is not a function', function (done) {
                Context.init({ contextStorage: memoryStorage });
                Context.load().then(function () {
                    var context = Context.get("1", "flow");
                    context.keys("memory", "callback");
                    done("should throw an error.");
                }).catch(function () {
                    done();
                });
            });

            it('should not throw an error if callback of context.keys is not specified', function (done) {
                Context.init({ contextStorage: memoryStorage });
                Context.load().then(function () {
                    var context = Context.get("1", "flow");
                    context.keys("memory");
                    done();
                }).catch(done);
            });

        });

        describe('listStores', function () {
            it('should list context storages', function (done) {
                Context.init({ contextStorage: contextDefaultStorage });
                Context.load().then(function () {
                    var list = Context.listStores();
                    list.default.should.equal("default");
                    list.stores.should.eql(["default", "test"]);
                    done();
                }).catch(done);
            });

            it('should list context storages without default storage', function (done) {
                Context.init({ contextStorage: contextStorage });
                Context.load().then(function () {
                    var list = Context.listStores();
                    list.default.should.equal("test");
                    list.stores.should.eql(["test"]);
                    done();
                }).catch(done);
            });
        });

        describe('delete context',function(){
            it('should not call delete() when external context storage is used', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    Context.get("flowA");
                    return Context.delete("flowA").then(function(){
                        stubDelete.called.should.be.false();
                        stubDelete2.called.should.be.false();
                        done();
                    });
                }).catch(done);
            });
        });

        describe('clean context',function(){
            it('should call clean()', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    return Context.clean({allNodes:{}}).then(function(){
                        stubClean.calledWithExactly([]).should.be.true();
                        stubClean2.calledWithExactly([]).should.be.true();
                        done();
                    });
                }).catch(done);
            });
        });
    });

});
