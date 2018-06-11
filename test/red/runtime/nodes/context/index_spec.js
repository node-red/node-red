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
var when = require("when")
var rewire = require("rewire");
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
                var keys = context.global.keys("global");
                keys.should.have.length(1);
                keys[0].should.equal("foo");
            });
        });

        it('should throw error when persistable key is passed', function() {
            var context =  Context.get("1","flow");
            (function() {
                context.set("#nonexist.key1", "val1");
            }).should.throw();
            (function() {
                context.get("#nonexist.key1");
            }).should.throw();
            (function() {
                context.keys("#nonexist");
            }).should.throw();
        });
    });

    describe('external context storage',function() {
        var sandbox = sinon.sandbox.create();
        var stubGetAsync = sandbox.stub().returns(when.resolve());
        var stubSetAsync = sandbox.stub().returns(when.resolve());
        var stubKeysAsync = sandbox.stub().returns(when.resolve());
        var stubDelete = sandbox.stub().returns(when.resolve());
        var stubClean = sandbox.stub().returns(when.resolve());
        var stubOpen = sandbox.stub().returns(when.resolve());
        var stubClose = sandbox.stub().returns(when.resolve());
        var stubGetAsync2 = sandbox.stub().returns(when.resolve());
        var stubSetAsync2 = sandbox.stub().returns(when.resolve());
        var stubKeysAsync2 = sandbox.stub().returns(when.resolve());
        var stubDelete2 = sandbox.stub().returns(when.resolve());
        var stubClean2 = sandbox.stub().returns(when.resolve());
        var stubOpen2 = sandbox.stub().returns(when.resolve());
        var stubClose2 = sandbox.stub().returns(when.resolve());
        var testPlugin = function(config){
            function Test(){}
            Test.prototype.getAsync = stubGetAsync;
            Test.prototype.setAsync = stubSetAsync;
            Test.prototype.keysAsync = stubKeysAsync;
            Test.prototype.delete = stubDelete;
            Test.prototype.clean = stubClean;
            Test.prototype.open = stubOpen;
            Test.prototype.close = stubClose;
            return new Test(config);
        };
        var testPlugin2 = function(config){
            function Test2(){}
            Test2.prototype.getAsync = stubGetAsync2;
            Test2.prototype.setAsync = stubSetAsync2;
            Test2.prototype.keysAsync = stubKeysAsync2;
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
                Context.init({contextStorage:{file:{module:"localfilesystem"}}});
                return Context.load();
            });
            it('should accept special storage name', function() {
                Context.init({
                    contextStorage:{
                        "#%&":{module:"memory"},
                        \u3042:{module:"memory"},
                        1:{module:"memory"},
                    }
                });
                return Context.load().then(function(){
                    var context = Context.get("1","flow");
                    return when.all([
                        context.setAsync("##%&.sign","sign1").then(function(){
                            return context.getAsync("##%&.sign").should.finally.equal("sign1");
                        }),
                        context.setAsync("#\u3042.file2","file2").then(function(){
                            return context.getAsync("#\u3042.file2").should.finally.equal("file2");
                        }),
                        context.setAsync("#1.num","num3").then(function(){
                            return context.getAsync("#1.num").should.finally.equal("num3");
                        })
                    ]);
                });
            });
            it('should ignore reserved storage name `_`', function() {
                Context.init({contextStorage:{_:{module:testPlugin}}});
                return Context.load().then(function(){
                    var context = Context.get("1","flow");
                    return when.all([
                        context.setAsync("#_.foo","bar"),
                        context.getAsync("#_.foo"),
                        context.keysAsync("#_")
                    ]).then(function(){
                        stubSetAsync.called.should.be.false();
                        stubGetAsync.called.should.be.false();
                        stubKeysAsync.called.should.be.false();
                    });
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
            it('should store local property to external context storage',function() {
                Context.init({contextStorage:contextStorage});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.setAsync("#test.foo","test"),
                        context.getAsync("#test.foo"),
                        context.keysAsync("#test")
                    ]).then(function(){
                        stubSetAsync.calledWithExactly("1:flow","foo","test").should.be.true();
                        stubGetAsync.calledWithExactly("1:flow","foo").should.be.true();
                        stubKeysAsync.calledWithExactly("1:flow").should.be.true();
                    });
                });
            });
            it('should store flow property to external context storage',function() {
                Context.init({contextStorage:contextStorage});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.flow.setAsync("#test.foo","test"),
                        context.flow.getAsync("#test.foo"),
                        context.flow.keysAsync("#test")
                    ]).then(function(){
                        stubSetAsync.calledWithExactly("flow","foo","test").should.be.true();
                        stubGetAsync.calledWithExactly("flow","foo").should.be.true();
                        stubKeysAsync.calledWithExactly("flow").should.be.true();
                    });
                });
            });
            it('should store global property to external context storage',function() {
                Context.init({contextStorage:contextStorage});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.global.setAsync("#test.foo","test"),
                        context.global.getAsync("#test.foo"),
                        context.global.keysAsync("#test")
                    ]).then(function(){
                        stubSetAsync.calledWithExactly("global","foo","test").should.be.true();
                        stubGetAsync.calledWithExactly("global","foo").should.be.true();
                        stubKeysAsync.calledWithExactly("global").should.be.true();
                    });
                });
            });
            it('should store data to the default context when non-existent context storage was specified', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.setAsync("#nonexist.foo","test"),
                        context.getAsync("#nonexist.foo"),
                        context.keysAsync("#nonexist")
                    ]).then(function(){
                        stubGetAsync.called.should.be.false();
                        stubSetAsync.called.should.be.false();
                        stubKeysAsync.called.should.be.false();
                        stubSetAsync2.calledWithExactly("1:flow","foo","test").should.be.true();
                        stubGetAsync2.calledWithExactly("1:flow","foo").should.be.true();
                        stubKeysAsync2.calledWithExactly("1:flow").should.be.true();
                    });
                });
            });
            it('should use the default context', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.setAsync("#default.foo","default"),
                        context.getAsync("#default.foo"),
                        context.keysAsync("#default")
                    ]).then(function(){
                        stubGetAsync.called.should.be.false();
                        stubSetAsync.called.should.be.false();
                        stubKeysAsync.called.should.be.false();
                        stubSetAsync2.calledWithExactly("1:flow","foo","default").should.be.true();
                        stubGetAsync2.calledWithExactly("1:flow","foo").should.be.true();
                        stubKeysAsync2.calledWithExactly("1:flow").should.be.true();
                    });
                });
            });
            it('should use the alias of default context', function() {
                Context.init({contextStorage:contextDefaultStorage});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.setAsync("#.foo","alias"),
                        context.getAsync("#.foo"),
                        context.keysAsync("#")
                    ]).then(function(){
                        stubGetAsync.called.should.be.false();
                        stubSetAsync.called.should.be.false();
                        stubKeysAsync.called.should.be.false();
                        stubSetAsync2.calledWithExactly("1:flow","foo","alias").should.be.true();
                        stubGetAsync2.calledWithExactly("1:flow","foo").should.be.true();
                        stubKeysAsync2.calledWithExactly("1:flow").should.be.true();
                    });
                });
            });
            it('should use default as the alias of other context', function() {
                Context.init({contextStorage:contextAlias});
                return Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    return when.all([
                        context.setAsync("#.foo","alias"),
                        context.getAsync("#.foo"),
                        context.keysAsync("#")
                    ]).then(function(){
                        stubSetAsync.calledWithExactly("1:flow","foo","alias").should.be.true();
                        stubGetAsync.calledWithExactly("1:flow","foo").should.be.true();
                        stubKeysAsync.calledWithExactly("1:flow").should.be.true();
                    });
                });
            });
            it('should throw an error using undefined storage for local context', function(done) {
                Context.init({contextStorage:contextStorage});
                Context.load().then(function(){
                    var context =  Context.get("1","flow");
                    context.getAsync("#nonexist.local");
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
                    context.flow.setAsync("#nonexist.flow");
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
            it('should not call delete()', function() {
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

        describe('key name',function() {
            beforeEach(function() {
                Context.init({contextStorage:{memory:{module:"memory"}}});
                return Context.load().then(function(){
                    context =  Context.get("1","flow");
                });
            });
            afterEach(function() {
                Context.clean({allNodes:{}});
                return Context.close();
            });
            it('should work correctly with the valid key name',function() {
                return when.all([
                    context.setAsync("#memory.azAZ09#_","valid"),
                    context.setAsync("#memory.a.b","ab")
                ]).then(function(){
                    context.getAsync("#memory.azAZ09#_").should.finally.equal("valid");
                    context.getAsync("#memory.a.b").should.finally.equal("ab");
                });
            });
            it('should treat the key name without dot as a normal context',function() {
                return context.setAsync("#memory","normal").then(function(){
                    return context.getAsync("#memory").should.finally.equal("normal");
                });
            });
            it('should fail when specifying invalid characters',function() {
                (function() {
                    context.setAsync("#memory.a.-","invalid1");
                }).should.throw();
                (function() {
                    context.setAsync("#memory.'abc","invalid2");
                }).should.throw();
            });
            it('should fail when specifying unnecesary space characters for key name',function() {
                (function() {
                    context.setAsync("# memory.space","space1");
                }).should.throw();
                (function() {
                    context.setAsync("#memory .space","space2");
                }).should.throw();
                (function() {
                    context.setAsync("#memory. space","space3");
                }).should.throw();
            });
        });
    });

    describe('#parseKey()', function() {
        var parseKey = rewire("../../../../../red/runtime/nodes/context/index").__get__("parseKey");

        function returnModuleAndKey(input, expectedModule, expectedKey) {
            var result = parseKey(input);
            result.storage.should.equal(expectedModule);
            result.key.should.equal(expectedKey);
        }

        it('should return module and key', function() {
            returnModuleAndKey("#test.aaa","test","aaa");
            returnModuleAndKey("#test.aaa.bbb","test","aaa.bbb");
            returnModuleAndKey("#1.234","1","234");
            returnModuleAndKey("##test.foo","#test","foo");
            returnModuleAndKey("#test.#foo","test","#foo");
            returnModuleAndKey("#test.#foo.#bar","test","#foo.#bar");
            returnModuleAndKey("#test..foo","test",".foo");
            returnModuleAndKey("#test..","test",".");
            returnModuleAndKey("#te-_st.aaa","te-_st","aaa");
            returnModuleAndKey("#te{st.a2","te{st","a2");
            returnModuleAndKey("#te[st.a3","te[st","a3");
            returnModuleAndKey("#te'st.a4","te'st","a4");
            returnModuleAndKey("#te\"st.a5","te\"st","a5");
        });

        it('should return module as default', function() {
            returnModuleAndKey("#default.foo","default","foo");
            returnModuleAndKey("#.foo","default","foo");
        });

        it('should return only keys', function() {
            returnModuleAndKey("test.aaa", "", "test.aaa");
            returnModuleAndKey("test", "", "test");
            returnModuleAndKey("#test", "", "#test");
        });

        it('should fail with null key', function() {
            (function() {
                parseKey("");
            }).should.throw();

            (function() {
                parseKey(null);
            }).should.throw();
        });

        it('should fail with space character', function() {
            (function() {
                parseKey(" #test");
            }).should.throw();

            (function() {
                parseKey("#test .a");
            }).should.throw();
        });

        it('should fail with empty key', function() {
            (function() {
                parseKey("#test.");
            }).should.throw();
        });
    });

});
