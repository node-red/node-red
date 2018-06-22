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
var Context = require("../../../../../red/runtime/nodes/context/index");

describe('context', function() {
    describe('local memory',function() {
        beforeEach(function() {
            Context.init({});
            return Context.load();
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

        it('enumerates context keys', function() {
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

        it('should enumerate only context keys when GlobalContext was given', function() {
            Context.init({functionGlobalContext: {foo:"bar"}});
            return Context.load().then(function(){
                var context = Context.get("1","flowA");
                var keys = context.global.keys();
                keys.should.have.length(1);
                keys[0].should.equal("foo");
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

        afterEach(function() {
            sandbox.reset();
            return Context.clean({allNodes:{}}).then(function(){
                return Context.close();
            });
        });

        describe('load modules',function(){
            it('should call open()', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
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
            it('should accept special storage name', function(done) {
                Context.init({
                    contextStorage:{
                        "#%&":{module:testPlugin},
                        \u3042:{module:testPlugin},
                        1:{module:testPlugin},
                    }
                });
                Context.load().then(function(){
                    var context = Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("sign","sign1","#%&",cb);
                    context.set("file","file2","\u3042",cb);
                    context.set("num","num3","1",cb);
                    stubSet.calledWithExactly("1:flow","sign","sign1",cb).should.be.true();
                    stubSet.calledWithExactly("1:flow","file","file2",cb).should.be.true();
                    stubSet.calledWithExactly("1:flow","num","num3",cb).should.be.true();
                    done();
                });
            });
            it('should ignore reserved storage name `_`', function(done) {
                Context.init({contextStorage:{_:{module:testPlugin}}});
                Context.load().then(function(){
                    var context = Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("foo","bar","_",cb);
                    context.get("foo","_",cb);
                    context.keys("_",cb);
                    stubSet.called.should.be.false();
                    stubGet.called.should.be.false();
                    stubKeys.called.should.be.false();
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
        });

        describe('close modules',function(){
            it('should call close()', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
                    return Context.close().then(function(){
                        stubClose.called.should.be.true();
                        stubClose2.called.should.be.true();
                    });
                });
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
                    stubGet.calledWithExactly("1:flow","foo",cb).should.be.true();
                    stubKeys.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                });
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
                    stubGet.calledWithExactly("flow","foo",cb).should.be.true();
                    stubKeys.calledWithExactly("flow",cb).should.be.true();
                    done();
                });
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
                    stubGet.calledWithExactly("global","foo",cb).should.be.true();
                    stubKeys.calledWithExactly("global",cb).should.be.true();
                    done();
                });
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
                    stubGet2.calledWithExactly("1:flow","foo",cb).should.be.true();
                    stubKeys2.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                });
            });
            it('should use the default context', function(done) {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.set("foo","bar","defaultt",cb);
                    context.get("foo","default",cb);
                    context.keys("default",cb);
                    stubGet.called.should.be.false();
                    stubSet.called.should.be.false();
                    stubKeys.called.should.be.false();
                    stubSet2.calledWithExactly("1:flow","foo","bar",cb).should.be.true();
                    stubGet2.calledWithExactly("1:flow","foo",cb).should.be.true();
                    stubKeys2.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                });
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
                    stubGet2.calledWithExactly("1:flow","foo",cb).should.be.true();
                    stubKeys2.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                });
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
                    stubGet.calledWithExactly("1:flow","foo",cb).should.be.true();
                    stubKeys.calledWithExactly("1:flow",cb).should.be.true();
                    done();
                });
            });
            it('should throw an error using undefined storage for local context', function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.get("local","nonexist",cb);
                    should.fail(null, null, "An error was not thrown using undefined storage for local context");
                }).catch(function(err) {
                    if (err.name === "ContextError") {
                        done();
                    } else {
                        done(err);
                    }
                });
            });
            it('should throw an error using undefined storage for flow context', function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    var cb = function(){done("An error occurred")}
                    context.flow.get("flow","nonexist",cb);
                    should.fail(null, null, "An error was not thrown using undefined storage for flow context");
                }).catch(function(err) {
                    if (err.name === "ContextError") {
                        done();
                    } else {
                        done(err);
                    }
                });
            });
        });

        describe('delete context',function(){
            it('should not call delete() when external context storage is used', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
                    Context.get("flowA");
                    return Context.delete("flowA").then(function(){
                        stubDelete.called.should.be.false();
                        stubDelete2.called.should.be.false();
                    });
                });
            });
        });

        describe('clean context',function(){
            it('should call clean()', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
                    return Context.clean({allNodes:{}}).then(function(){
                        stubClean.calledWithExactly([]).should.be.true();
                        stubClean2.calledWithExactly([]).should.be.true();
                    });
                });
            });
        });
    });
});
