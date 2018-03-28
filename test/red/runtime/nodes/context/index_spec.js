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

        describe('if external context storage exists',function() {
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
            it('should store data on default context', function() {
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
            it('should load memory module', function(done) {
                Context.init({ contextStorage: { _: {}}});
                try {
                    Context.load();
                    context.set("_.foo","test");
                    context.get("$_.foo");
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
            it('should fail when using invalid default context', function(done) {
                Context.init({contextStorage:{default:"noexist"}});
                try {
                    Context.load();
                    try {
                        should.fail(null, null, "An error was not thrown using undefined storage for flow context");
                    } catch (err) {
                        done(err);
                    }
                } catch (err) {
                    done();
                }
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
            it('should fail for the storage with no module', function(done) {
                Context.init({ contextStorage: { test: {}}});
                try {
                    Context.load();
                    try {
                        should.fail(null, null, "Should fail when no module was specified");
                    } catch (err) {
                        done(err);
                    }
                } catch (err) {
                    done();
                }
            });
            it('should fail to load non-existent module', function(done) {
                Context.init({contextStorage:{ file:{module:"nonexistent"} }});
                try {
                    Context.load();
                    try {
                        should.fail(null, null, "Should fail to load non-existent module");
                    } catch (err) {
                        done(err);
                    }
                } catch (err) {
                    done();
                }
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

        function returnModule(input, expectedModule) {
            var result = parseKey(input);
            result.storage.should.eql(expectedModule);
            should(result.key).be.null();
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
        });

        // it('should return only module', function() {
        //     returnModule("$test","test",null);
        //     returnModule("$1","1",null);
        //     returnModule("$$test","$test",null);
        //     returnModule("$test.","test.",null);
        // });

        it('should return module as default', function() {
            returnModuleAndKey("$default.foo","default","foo");
            returnModuleAndKey("$.foo","default","foo");
            // returnModule("$default","default");
            // returnModule("$","default");
        });

        it('should return null', function() {
            var keyPath = parseKey("test.aaa");
            keyPath.storage.should.eql("");
            keyPath.key.should.eql("test.aaa");

            keyPath = parseKey("test");
            keyPath.storage.should.eql("");
            keyPath.key.should.eql("test");

            should(parseKey(null)).be.null();
        });
    });

});
