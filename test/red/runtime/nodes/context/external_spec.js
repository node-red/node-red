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
var external = require("../../../../../red/runtime/nodes/context/external");

describe("external", function() {
    var stubModule = {
        module: {
            init: function(){},
            get: function(){},
            set: function(){},
            keys: function(){},
            run: function(){},
            close: function(){}
        },
        config: {}
    };
    describe('#init()', function() {
        it('should load bundle module as default', function() {
            external.init({
                contextStorage:{
                    default:{
                        module: "./localfilesystem",
                        config:{}
                    }
            }});
            external.hasContextStorage("default").should.be.true();
        });

        it('should load bundle module as localfile', function() {
            external.init({
                contextStorage:{
                    localfile:{
                        module: "./localfilesystem",
                        config:{}
                    }
            }});
            external.hasContextStorage("localfile").should.be.true();
        });

        it('should not load non-existent module', function() {
            external.init({
                contextStorage:{
                    default:{
                        module: "non-existent-module",
                        config:{}
                    }

            }})
            external.hasContextStorage("default").should.be.false();
        });

        it('should load multiple modules', function() {
            external.init({
                contextStorage:{
                    default:{
                        module: "./localfilesystem",
                        config:{}
                    },
                    test:{
                        module: {
                            init: function() {
                                return true;
                            }
                        },
                        config:{}
                    }
                }
            });
            external.hasContextStorage("default").should.be.true();
            external.hasContextStorage("test").should.be.true();
        });

        it('should load multiple modules without non-existent module', function() {
            external.init({
                contextStorage:{
                    nonexist:{
                        module: "non-existent-module",
                        config:{}
                    },
                    default:{
                        module: "./localfilesystem",
                        config:{}
                    },
                    test:{
                        module: {
                            init: function() {
                                return true;
                            }
                        },
                        config:{}
                    }
                }
            });
            external.hasContextStorage("nonexist").should.be.false();
            external.hasContextStorage("default").should.be.true();
            external.hasContextStorage("test").should.be.true();
        });
    });

    // describe('#get()', function() {
    // });

    // describe('#set()', function() {
    // });

    // describe('#keys()', function() {
    // });    

    // describe('#hasContextStorage()', function() {
    // });

    describe('#canUse()', function() {
        it('should return true if specified module is loaded', function() {
            external.init({
                contextStorage:{
                    localfilesystem:{
                        module: {name:"test",init: function(){return true}},
                        config: {}
                    }
                }
            });
            external.canUse("$localfilesystem").should.be.true();
            external.canUse("$localfilesystem.foo").should.be.true();
        });
        it('should return false if specified module is not loaded', function() {
            external.init({
                contextStorage:{
                    localfilesystem:{
                        module: {name:"test",init: function(){return true}},
                        config: {}
                    }
                }
            });
            external.canUse("$file").should.be.false();
            external.canUse("$file.foo").should.be.false();
        });
        it('should return true if specified module is not loaded but default module is loaded', function() {
            external.init({
                contextStorage:{
                    default:{
                        module: {name:"test",init: function(){return true}},
                        config: {}
                    }
                }
            });
            external.canUse("$file").should.be.true();
            external.canUse("$file.foo").should.be.true();
        });
        it('should return false if argument does not contain module name', function() {
            external.init({
                contextStorage:{
                    default:{
                        module: {name:"test",init: function(){return true}},
                        config: {}
                    }
                }
            });
            external.canUse("file").should.be.false();
            external.canUse("file.foo").should.be.false();
        });
    });

    describe('#parseKey()', function() {
        function returnModuleAndKey(input, expectedModule, expectedKey) {
            var result = external.parseKey(input);
            result[0].should.eql(expectedModule);
            result[1].should.eql(expectedKey);
        };

        function returnModule(input, expectedModule) {
            var result = external.parseKey(input);
            result[0].should.eql(expectedModule);
            should(result[1]).be.null();
        };

        it('should retrun module and key', function() {
            returnModuleAndKey("$test.aaa","test","aaa");
            returnModuleAndKey("$test.aaa.bbb","test","aaa.bbb");
            returnModuleAndKey("$1.234","1","234");
            returnModuleAndKey("$$test.foo","$test","foo");
            returnModuleAndKey("$test.$foo","test","$foo"); 
            returnModuleAndKey("$test.$foo.$bar","test","$foo.$bar"); 
            returnModuleAndKey("$test..foo","test",".foo");
            returnModuleAndKey("$test..","test",".");
        });

        it('should retrun only module', function() {
            returnModule("$test","test",null);
            returnModule("$1","1",null);
            returnModule("$$test","$test",null);
            returnModule("$test.","test.",null);
        });

        it('should retrun module as default', function() {
            returnModuleAndKey("$default.foo","default","foo");
            returnModuleAndKey("$.foo","default","foo");
            returnModule("$default","default");
            returnModule("$","default");
        });

        it('should retrun null', function() {
            should(external.parseKey("test.aaa")).be.null();
            should(external.parseKey("test")).be.null();
            should(external.parseKey(null)).be.null();
        });
    });
});