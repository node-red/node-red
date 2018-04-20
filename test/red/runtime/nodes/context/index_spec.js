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
var path = require('path');
var fs = require('fs-extra');
var rewire = require("rewire");
var Context = require("../../../../../red/runtime/nodes/context/index");

describe('context', function() {
    describe('localmemory',function() {
        beforeEach(function() {
            Context.init({});
        });
        afterEach(function() {
            Context.clean({allNodes:{}});
        });
        it('stores local property',function() {
            var context1 = Context.get("1","flowA");
            should.not.exist(context1.get("foo"));
            context1.set("foo","test");
            context1.get("foo").should.eql("test");
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
            context1.flow.get("foo").should.eql("test");
        });
        it('stores global property',function() {
            var context1 = Context.get("1","flowA");
            should.not.exist(context1.global.get("foo"));
            context1.global.set("foo","test");
            context1.global.get("foo").should.eql("test");
        });

        it('keeps local context local', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowA");

            should.not.exist(context1.get("foo"));
            should.not.exist(context2.get("foo"));
            context1.set("foo","test");

            context1.get("foo").should.eql("test");
            should.not.exist(context2.get("foo"));
        });
        it('flow context accessible to all flow nodes', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowA");

            should.not.exist(context1.flow.get("foo"));
            should.not.exist(context2.flow.get("foo"));

            context1.flow.set("foo","test");
            context1.flow.get("foo").should.eql("test");
            context2.flow.get("foo").should.eql("test");
        });

        it('flow context not shared to nodes on other flows', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowB");

            should.not.exist(context1.flow.get("foo"));
            should.not.exist(context2.flow.get("foo"));

            context1.flow.set("foo","test");
            context1.flow.get("foo").should.eql("test");
            should.not.exist(context2.flow.get("foo"));
        });

        it('global context shared to all nodes', function() {
            var context1 = Context.get("1","flowA");
            var context2 = Context.get("2","flowB");

            should.not.exist(context1.global.get("foo"));
            should.not.exist(context2.global.get("foo"));

            context1.global.set("foo","test");
            context1.global.get("foo").should.eql("test");
            context2.global.get("foo").should.eql("test");
        });

        it('deletes context',function() {
            var context = Context.get("1","flowA");
            should.not.exist(context.get("foo"));
            context.set("foo","abc");
            context.get("foo").should.eql("abc");

            Context.delete("1","flowA");
            context = Context.get("1","flowA");
            should.not.exist(context.get("foo"));
        });

        it.skip('enumerates context keys', function() {
            var context = Context.get("1","flowA");

            var keys = context.keys();
            keys.should.be.an.Array();
            keys.should.be.empty();

            context.set("foo","bar");
            keys = context.keys();
            keys.should.have.length(1);
            keys[0].should.eql("foo");

            context.set("abc.def","bar");
            keys = context.keys();
            keys.should.have.length(2);
            keys[1].should.eql("abc");
        });
    });

    describe('external context storage',function() {
        var testDir = path.join(__dirname,".testUserHome");
        var context;
        var stubGet = sinon.stub();
        var stubSet = sinon.stub();
        var stubKeys = sinon.stub();
        var stubDelete = sinon.stub();
        var contextStorage={
            test:{
                module: {
                    init: function() {
                        return true;
                    },
                    get: stubGet,
                    set: stubSet,
                    keys: stubKeys,
                    delete: stubDelete
                },
                config:{}
            }
        };

        afterEach(function(done) {
            stubGet.reset();
            stubSet.reset();
            stubKeys.reset();
            Context.clean({allNodes:{}});
            fs.remove(testDir,done);
        });

        function initializeContext() {
            Context.init({contextStorage:contextStorage});
            Context.load();
            context =  Context.get("1","flow");
        }

        describe('key name',function() {
            var memoryStorage = {
                memory: {
                    module: "memory"
                }
            };
            beforeEach(function() {
                Context.init({contextStorage:memoryStorage});
                Context.load();
                context =  Context.get("1","flow");
            });
            afterEach(function() {
                Context.clean({allNodes:{}});
            });
            it('should work correctly with the valid key name',function() {
                context.set("$memory.azAZ09$_","valid");
                context.get("$memory.azAZ09$_").should.eql("valid");
                context.set("$memory.a.b","ab");
                context.get("$memory.a.b").should.eql("ab");
            });
            it('should treat the key name without dot as a normal context',function() {
                context.set("$memory","normal");
                context.get("$memory").should.eql("normal");
            });
            it('should fail when specifying invalid characters',function() {
                (function() {
                    context.set("$memory.a.-","invalid1");
                }).should.throw();
                (function() {
                    context.set("$memory.'abc","invalid2");
                }).should.throw();
            });
            it('should fail when specifying unnecesary space characters for key name',function() {
                (function() {
                    context.set("$ memory.space","space1");
                }).should.throw();
                (function() {
                    context.set("$memory .space","space2");
                }).should.throw();
                (function() {
                    context.set("$memory. space","space3");
                }).should.throw();
            });
        });

        describe('if external context storage exists',function() {
            var contextDefaultStorage={
                default: "test",
                test:{
                    module: {
                        init: function() {
                            return true;
                        },
                        get: stubGet,
                        set: stubSet,
                        keys: stubKeys,
                        delete: stubDelete
                    },
                    config:{}
                }
            };

            it('should store local property to external context storage',function() {
                initializeContext();
                should.not.exist(context.get("$test.foo"));
                context.set("$test.foo","test");
                context.get("$test.foo");
                context.keys("$test");
                stubGet.called.should.be.true();
                stubSet.called.should.be.true();
                stubKeys.called.should.be.true();
            });
            it('should store flow property to external context storage',function() {
                initializeContext();
                should.not.exist(context.flow.get("$test.foo"));
                context.flow.set("$test.foo","test");
                context.flow.get("$test.foo");
                context.flow.keys("$test");
                stubGet.called.should.be.true();
                stubSet.called.should.be.true();
                stubKeys.called.should.be.true();
            });
            it('should store global property to external context storage',function() {
                initializeContext();
                should.not.exist(context.global.get("$test.foo"));
                context.global.set("$test.foo","test");
                context.global.get("$test.foo");
                context.global.keys("$test");
                stubGet.called.should.be.true();
                stubSet.called.should.be.true();
                stubKeys.called.should.be.true();
            });
            it('should store data when non-existent context storage was specified', function() {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load();
                context =  Context.get("1","flow");
                should.not.exist(context.get("$nonexist.foo"));
                context.set("$nonexist.foo","test");
                context.get("$nonexist.foo");
                context.keys("$nonexist");
                stubGet.called.should.be.true();
                stubSet.called.should.be.true();
                stubKeys.called.should.be.true();
            });
            it('should use the default context', function() {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load();
                context =  Context.get("1","flow");
                should.not.exist(context.get("$default.foo"));
                context.set("$default.foo","default");
                context.get("$default.foo");
                context.keys("$default");
                stubGet.called.should.be.true();
                stubSet.called.should.be.true();
                stubKeys.called.should.be.true();
            });
            it('should use the alias of default context', function() {
                Context.init({contextStorage:contextDefaultStorage});
                Context.load();
                context =  Context.get("1","flow");
                should.not.exist(context.get("$.foo"));
                context.set("$.foo","alias");
                context.get("$.foo");
                context.keys("$");
                stubGet.called.should.be.true();
                stubSet.called.should.be.true();
                stubKeys.called.should.be.true();
            });
            it('should load memory module', function(done) {
                Context.init({ contextStorage: { _: {}}});
                try {
                    Context.load();
                    context.set("$_.foo","mem1");
                    context.get("$_.foo").should.eql("mem1");
                    var keys = context.keys("$_");
                    keys.should.have.length(1);
                    keys[0].should.eql("foo");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            it('should load localfilesystem module', function(done) {
                Context.init({contextStorage:{ file:{module:"localfilesystem"} }});
                try {
                    Context.load();
                    done();
                } catch (err) {
                    done(err);
                }
            });
            it('should accept special storage name', function(done) {
                Context.init({
                    contextStorage:{
                        "#%&":{module:"memory"},
                        \u3042:{module:"memory"},
                        1:{module:"localfilesystem"},
                    }
                });
                try {
                    Context.load();
                    context.set("$#%&.sign","sign1");
                    context.get("$#%&.sign").should.eql("sign1");
                    context.set("$\u3042.file2","file2");
                    context.get("$\u3042.file2").should.eql("file2");
                    context.set("$1.num","num3");
                    context.get("$1.num").should.eql("num3");
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        describe('if external context storage does not exist',function() {
            it('should throw an error using undefined storage for local context', function(done) {
                initializeContext();
                try {
                    context.get("$nonexist.local");
                    should.fail(null, null, "An error was not thrown using undefined storage for local context");
                } catch (err) {
                    if (err.name === "ContextError") {
                        done();
                    } else {
                        done(err);
                    }
                }
            });
            it('should throw an error using undefined storage for flow context', function(done) {
                initializeContext();
                try {
                    context.flow.set("$nonexist.flow");
                    should.fail(null, null, "An error was not thrown using undefined storage for flow context");
                } catch (err) {
                    if (err.name === "ContextError") {
                        done();
                    } else {
                        done(err);
                    }
                }
            });
            it('should fail when using invalid default context', function() {
                Context.init({contextStorage:{default:"noexist"}});
                (function() {
                    Context.load();
                }).should.throw();
            });
            it('should store data on memory when contextStorage is not defined', function() {
                Context.init({});
                Context.load();
                context =  Context.get("1","flow");
                context.set("$nonexist.key1", "val1");
                context.get("$nonexist.key1").should.eql("val1");
                context.flow.set("$nonexist.key2", "val2");
                context.flow.get("$nonexist.key2").should.eql("val2");
                context.global.set("$nonexist.key1", "val3");
                context.global.get("$nonexist.key1").should.eql("val3");
            });
            it('should fail for the storage with no module', function() {
                Context.init({ contextStorage: { test: {}}});
                (function() {
                    Context.load();
                }).should.throw();
            });
            it('should fail to load non-existent module', function() {
                Context.init({contextStorage:{ file:{module:"nonexistent"} }});
                (function() {
                    Context.load();
                }).should.throw();
            });
        });
    });

    describe('#parseKey()', function() {
        var parseKey = rewire("../../../../../red/runtime/nodes/context/index").__get__("parseKey");

        function returnModuleAndKey(input, expectedModule, expectedKey) {
            var result = parseKey(input);
            result.storage.should.eql(expectedModule);
            result.key.should.eql(expectedKey);
        };

        it('should return module and key', function() {
            returnModuleAndKey("$test.aaa","test","aaa");
            returnModuleAndKey("$test.aaa.bbb","test","aaa.bbb");
            returnModuleAndKey("$1.234","1","234");
            returnModuleAndKey("$$test.foo","$test","foo");
            returnModuleAndKey("$test.$foo","test","$foo"); 
            returnModuleAndKey("$test.$foo.$bar","test","$foo.$bar"); 
            returnModuleAndKey("$test..foo","test",".foo");
            returnModuleAndKey("$test..","test",".");
            returnModuleAndKey("$te-_st.aaa","te-_st","aaa");
            returnModuleAndKey("$te{st.a2","te{st","a2");
            returnModuleAndKey("$te[st.a3","te[st","a3");
            returnModuleAndKey("$te'st.a4","te'st","a4");
            returnModuleAndKey("$te\"st.a5","te\"st","a5");
        });

        it('should return module as default', function() {
            returnModuleAndKey("$default.foo","default","foo");
            returnModuleAndKey("$.foo","default","foo");
        });

        it('should return only keys', function() {
            returnModuleAndKey("test.aaa", "", "test.aaa");
            returnModuleAndKey("test", "", "test");
            returnModuleAndKey("$test", "", "$test");
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
                parseKey(" $test");
            }).should.throw();

            (function() {
                parseKey("$test .a");
            }).should.throw();
        });

        it('should fail with empty key', function() {
            (function() {
                parseKey("$test.");
            }).should.throw();
        });
    });

});
