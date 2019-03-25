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
var when = require("when");
var sinon = require("sinon");
var path = require("path");

var NR_TEST_UTILS = require("nr-test-utils");

var typeRegistry = NR_TEST_UTILS.require("@node-red/registry/lib/registry");
var EventEmitter = require('events');

var events = new EventEmitter();

describe("red/nodes/registry/registry",function() {

    afterEach(function() {
        typeRegistry.clear();
    });

    function stubSettings(s,available,initialConfig) {
        s.available =  function() {return available;};
        s.set = sinon.spy(function(s,v) { return when.resolve();});
        s.get = function(s) { return initialConfig;};
        return s;
    }

    var settings = stubSettings({},false,null);
    var settingsWithStorageAndInitialConfig = stubSettings({},true,{"node-red":{module:"testModule",name:"testName",version:"testVersion",nodes:{"node":{id:"node-red/testName",name:"test",types:["a","b"],enabled:true}}}});

    var testNodeSet1 = {
        id: "test-module/test-name",
        module: "test-module",
        name: "test-name",
        enabled: true,
        loaded: false,
        config: "configA",
        types: [ "test-a","test-b"]
    };

    var testNodeSet2 = {
        id: "test-module/test-name-2",
        module: "test-module",
        name: "test-name-2",
        enabled: true,
        loaded: false,
        config: "configB",
        types: [ "test-c","test-d"]
    };
    var testNodeSet2WithError = {
        id: "test-module/test-name-2",
        module: "test-module",
        name: "test-name-2",
        enabled: true,
        loaded: false,
        err: "I have an error",
        config: "configC",
        types: [ "test-c","test-d"]
    };
    var testNodeSet3 = {
        id: "test-module-2/test-name-3",
        module: "test-module-2",
        name: "test-name-3",
        enabled: true,
        loaded: false,
        config: "configB",
        types: [ "test-a","test-e"]
    };



    describe('#init/load', function() {
        it('loads initial config', function(done) {
            typeRegistry.init(settingsWithStorageAndInitialConfig,null,events);
            typeRegistry.getNodeList().should.have.lengthOf(0);
            typeRegistry.load();
            typeRegistry.getNodeList().should.have.lengthOf(1);
            done();
        });

        it('migrates legacy format', function(done) {
            var legacySettings = {
                available: function() { return true; },
                set: sinon.stub().returns(when.resolve()),
                get: function() { return {
                    "123": {
                        "name": "72-sentiment.js",
                        "types": [
                            "sentiment"
                        ],
                        "enabled": true
                    },
                    "456": {
                        "name": "20-inject.js",
                        "types": [
                            "inject"
                        ],
                        "enabled": true
                    },
                    "789": {
                        "name": "testModule:a-module.js",
                        "types": [
                            "example"
                        ],
                        "enabled":true,
                        "module":"testModule"
                    }
                 }}
            };
            var expected = JSON.parse('{"node-red":{"name":"node-red","nodes":{"sentiment":{"name":"sentiment","types":["sentiment"],"enabled":true,"module":"node-red"},"inject":{"name":"inject","types":["inject"],"enabled":true,"module":"node-red"}}},"testModule":{"name":"testModule","nodes":{"a-module.js":{"name":"a-module.js","types":["example"],"enabled":true,"module":"testModule"}}}}');
            typeRegistry.init(legacySettings,null,events);
            typeRegistry.load();
            legacySettings.set.calledOnce.should.be.true();
            legacySettings.set.args[0][1].should.eql(expected);
            done();
        });
    });


    describe.skip('#addNodeSet', function() {
       it('adds a node set for an unknown module', function() {

           typeRegistry.init(settings,null,events);

           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});

           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");

           typeRegistry.getNodeList().should.have.lengthOf(1);
           var moduleList = typeRegistry.getModuleList();
           moduleList.should.have.a.property("test-module");
           moduleList["test-module"].should.have.a.property("name","test-module");
           moduleList["test-module"].should.have.a.property("version","0.0.1");
           moduleList["test-module"].should.have.a.property("nodes");
           moduleList["test-module"].nodes.should.have.a.property("test-name");

           moduleList["test-module"].nodes["test-name"].should.eql({
                   config: 'configA',
                   id: 'test-module/test-name',
                   module: 'test-module',
                   name: 'test-name',
                   enabled: true,
                   loaded: false,
                   types: [ 'test-a', 'test-b' ]
           });

       });

       it('adds a node set to an existing module', function() {

           typeRegistry.init(settings,null,events);
           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});

           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");

           typeRegistry.getNodeList().should.have.lengthOf(1);
           var moduleList = typeRegistry.getModuleList();
           Object.keys(moduleList).should.have.a.lengthOf(1);
           moduleList.should.have.a.property("test-module");
           moduleList["test-module"].should.have.a.property("name","test-module");
           moduleList["test-module"].should.have.a.property("version","0.0.1");
           moduleList["test-module"].should.have.a.property("nodes");

           Object.keys(moduleList["test-module"].nodes).should.have.a.lengthOf(1);
           moduleList["test-module"].nodes.should.have.a.property("test-name");


           typeRegistry.addNodeSet("test-module/test-name-2",testNodeSet2);

           typeRegistry.getNodeList().should.have.lengthOf(2);
           moduleList = typeRegistry.getModuleList();
           Object.keys(moduleList).should.have.a.lengthOf(1);
           Object.keys(moduleList["test-module"].nodes).should.have.a.lengthOf(2);
           moduleList["test-module"].nodes.should.have.a.property("test-name");
           moduleList["test-module"].nodes.should.have.a.property("test-name-2");
       });

       it('doesnt add node set types if node set has an error', function() {
           typeRegistry.init(settings,null,events);
           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});

           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");

           typeRegistry.getTypeId("test-a").should.eql("test-module/test-name");

           should.not.exist(typeRegistry.getTypeId("test-c"));

           typeRegistry.addNodeSet("test-module/test-name-2",testNodeSet2WithError, "0.0.1");

           should.not.exist(typeRegistry.getTypeId("test-c"));
       });

       it('doesnt add node set if type already exists', function() {
           typeRegistry.init(settings,null,events);
           typeRegistry.getNodeList().should.have.lengthOf(0);
           typeRegistry.getModuleList().should.eql({});

           should.not.exist(typeRegistry.getTypeId("test-e"));

           typeRegistry.addNodeSet("test-module/test-name",testNodeSet1, "0.0.1");
           typeRegistry.getNodeList().should.have.lengthOf(1);
           should.exist(typeRegistry.getTypeId("test-a"));
           typeRegistry.addNodeSet(testNodeSet3.id,testNodeSet3, "0.0.1");
           typeRegistry.getNodeList().should.have.lengthOf(2);

           // testNodeSet3 registers a duplicate test-a and unique test-e
           // as test-a is a duplicate, test-e should not get registered
           should.not.exist(typeRegistry.getTypeId("test-e"));

           var testNodeSet3Result = typeRegistry.getNodeList()[1];
           should.exist(testNodeSet3Result.err);
           testNodeSet3Result.err.code.should.equal("type_already_registered");
           testNodeSet3Result.err.details.type.should.equal("test-a");
           testNodeSet3Result.err.details.moduleA.should.equal("test-module");
           testNodeSet3Result.err.details.moduleB.should.equal("test-module-2");

           //
           // typeRegistry.addNodeSet("test-module/test-name-2",testNodeSet2WithError, "0.0.1");
           //
           // should.not.exist(typeRegistry.getTypeId("test-c"));
       });


    });

    describe("#enableNodeSet", function() {
        it('throws error if settings unavailable', function() {
            typeRegistry.init(settings,null,events);
            /*jshint immed: false */
            (function(){
                typeRegistry.enableNodeSet("test-module/test-name");
            }).should.throw("Settings unavailable");
        });

        it('throws error if module unknown', function() {
            typeRegistry.init(settingsWithStorageAndInitialConfig,null,events);
            /*jshint immed: false */
            (function(){
                typeRegistry.enableNodeSet("test-module/unknown");
            }).should.throw("Unrecognised id: test-module/unknown");
        });
        it.skip('enables the node',function(){})

    });
    describe("#disableNodeSet", function() {
        it('throws error if settings unavailable', function() {
            typeRegistry.init(settings,null,events);
            /*jshint immed: false */
            (function(){
                typeRegistry.disableNodeSet("test-module/test-name");
            }).should.throw("Settings unavailable");
        });

        it('throws error if module unknown', function() {
            typeRegistry.init(settingsWithStorageAndInitialConfig,null,events);
            /*jshint immed: false */
            (function(){
                typeRegistry.disableNodeSet("test-module/unknown");
            }).should.throw("Unrecognised id: test-module/unknown");
        });
        it.skip('disables the node',function(){})
    });

    describe('#getNodeConfig', function() {
        it('returns nothing for an unregistered type config', function(done) {
            typeRegistry.init(settings,null,events);
            var config = typeRegistry.getNodeConfig("imaginary-shark");
            (config === null).should.be.true();
            done();
        });
    });

    describe('#saveNodeList',function() {
        it('rejects when settings unavailable',function(done) {
            typeRegistry.init(stubSettings({},false,{}),null,events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {"test-name":{module:"test-module",name:"test-name",types:[]}}});
            typeRegistry.saveNodeList().catch(function(err) {
                done();
            });
        });
        it('saves the list',function(done) {
            var s = stubSettings({},true,{});
            typeRegistry.init(s,null,events);

            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":testNodeSet1,
                "test-name-2":testNodeSet2WithError
            }});

            typeRegistry.saveNodeList().then(function() {
                s.set.called.should.be.true();
                s.set.lastCall.args[0].should.eql('nodes');
                var nodes = s.set.lastCall.args[1];
                nodes.should.have.property('test-module');
                for (var n in nodes['test-module'].nodes) {
                    if (nodes['test-module'].nodes.hasOwnProperty(n)) {
                        var nn = nodes['test-module'].nodes[n];
                        nn.should.not.have.property('err');
                        nn.should.not.have.property('id');
                    }
                }
                done();
            }).catch(function(err) {
                done(err);
            });
        });
    });

    describe('#removeModule',function() {
        it('throws error for unknown module', function() {
            var s = stubSettings({},true,{});
            typeRegistry.init(s,null,events);
            /*jshint immed: false */
            (function(){
                typeRegistry.removeModule("test-module/unknown");
            }).should.throw("Unrecognised module: test-module/unknown");
        });
        it('throws error for unavaiable settings', function() {
            var s = stubSettings({},false,{});
            typeRegistry.init(s,null,events);
            /*jshint immed: false */
            (function(){
                typeRegistry.removeModule("test-module/unknown");
            }).should.throw("Settings unavailable");
        });
        it('removes a known module', function() {
            var s = stubSettings({},true,{});
            typeRegistry.init(s,null,events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":testNodeSet1
            }});
            var moduleList = typeRegistry.getModuleList();
            moduleList.should.have.a.property("test-module");
            typeRegistry.getNodeList().should.have.lengthOf(1);

            var info = typeRegistry.removeModule('test-module');
            moduleList = typeRegistry.getModuleList();
            moduleList.should.not.have.a.property("test-module");
            typeRegistry.getNodeList().should.have.lengthOf(0);
        });
    });

    describe('#get[All]NodeConfigs', function() {
        it('returns node config', function() {
            typeRegistry.init(settings,{
                getNodeHelp: function(config) { return "HE"+config.name+"LP" }
            },events);

            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"]
                },
                "test-name-2":{
                    id: "test-module/test-name-2",
                    module: "test-module",
                    name: "test-name-2",
                    enabled: true,
                    loaded: false,
                    config: "configB",
                    types: [ "test-c","test-d"]
                }
            }});
            typeRegistry.getNodeConfig("test-module/test-name").should.eql('<!-- --- [red-module:test-module/test-name] --- -->\nconfigAHEtest-nameLP');
            typeRegistry.getNodeConfig("test-module/test-name-2").should.eql('<!-- --- [red-module:test-module/test-name-2] --- -->\nconfigBHEtest-name-2LP');
            typeRegistry.getAllNodeConfigs().should.eql('\n<!-- --- [red-module:test-module/test-name] --- -->\nconfigAHEtest-nameLP\n<!-- --- [red-module:test-module/test-name-2] --- -->\nconfigBHEtest-name-2LP');
        });
    });
    describe('#getModuleInfo', function() {
        it('returns module info', function() {
            typeRegistry.init(settings,{},events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"],
                    file: "abc"
                }
            }});
            var moduleInfo = typeRegistry.getModuleInfo("test-module");
            moduleInfo.should.have.a.property('name','test-module');
            moduleInfo.should.have.a.property('version','0.0.1');
            moduleInfo.should.have.a.property('nodes');
            moduleInfo.nodes.should.have.a.lengthOf(1);
            moduleInfo.nodes[0].should.have.a.property('id','test-module/test-name');
            moduleInfo.nodes[0].should.not.have.a.property('file');
        });
    });
    describe('#getNodeInfo', function() {
        it('returns node info', function() {
            typeRegistry.init(settings,{},events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"],
                    file: "abc"
                }
            }});
            var nodeSetInfo = typeRegistry.getNodeInfo("test-module/test-name");
            nodeSetInfo.should.have.a.property('id',"test-module/test-name");
            nodeSetInfo.should.not.have.a.property('config');
            nodeSetInfo.should.not.have.a.property('file');
        });
    });
    describe('#getFullNodeInfo', function() {
        it('returns node info', function() {
            typeRegistry.init(settings,{},events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"],
                    file: "abc"

                }
            }});
            var nodeSetInfo = typeRegistry.getFullNodeInfo("test-module/test-name");
            nodeSetInfo.should.have.a.property('id',"test-module/test-name");
            nodeSetInfo.should.have.a.property('config');
            nodeSetInfo.should.have.a.property('file');
        });
    });
    describe('#cleanModuleList', function() {
        it.skip("cleans the module list");
    });
    describe('#getNodeList', function() {
        it("returns a filtered list", function() {
            typeRegistry.init(settings,{},events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"],
                    file: "abc"
                },
                "test-name-2":{
                    id: "test-module/test-name-2",
                    module: "test-module",
                    name: "test-name-2",
                    enabled: true,
                    loaded: false,
                    config: "configB",
                    types: [ "test-c","test-d"],
                    file: "def"
                }
            }});
            var filterCallCount = 0;
            var filteredList = typeRegistry.getNodeList(function(n) { filterCallCount++; return n.name === 'test-name-2';});
            filterCallCount.should.eql(2);
            filteredList.should.have.a.lengthOf(1);
            filteredList[0].should.have.a.property('id',"test-module/test-name-2");
        });
    });

    describe('#registerNodeConstructor', function() {
        var TestNodeConstructor;
        beforeEach(function() {
            TestNodeConstructor = function TestNodeConstructor() {};
            sinon.stub(events,'emit');
        });
        afterEach(function() {
            events.emit.restore();
        });
        it('registers a node constructor', function() {
            typeRegistry.registerNodeConstructor('node-set','node-type',TestNodeConstructor);
            events.emit.calledOnce.should.be.true();
            events.emit.lastCall.args[0].should.eql('type-registered');
            events.emit.lastCall.args[1].should.eql('node-type');
        })
        it('throws error on duplicate node registration', function() {
            typeRegistry.registerNodeConstructor('node-set','node-type',TestNodeConstructor);
            events.emit.calledOnce.should.be.true();
            events.emit.lastCall.args[0].should.eql('type-registered');
            events.emit.lastCall.args[1].should.eql('node-type');
            /*jshint immed: false */
            (function(){
                typeRegistry.registerNodeConstructor('node-set','node-type',TestNodeConstructor);
            }).should.throw("node-type already registered");
            events.emit.calledOnce.should.be.true();
        });
    });

    describe('#getNodeIconPath', function() {
        it('returns the null when getting an unknown icon', function() {
            var iconPath = typeRegistry.getNodeIconPath('random-module','youwonthaveme.png');
            should.not.exist(iconPath);
        });

        it('returns a registered icon' , function() {
            var testIcon = path.resolve(__dirname+'/resources/userDir/lib/icons/');
            typeRegistry.init(settings,{},events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"],
                    file: "abc"
                }
            },icons: [{path:testIcon,icons:['test_icon.png']}]});
            var iconPath = typeRegistry.getNodeIconPath('test-module','test_icon.png');
            iconPath.should.eql(path.resolve(testIcon+"/test_icon.png"));
        });

        it('returns null when getting an unknown module', function() {
            var debugIcon = path.resolve(__dirname+'/../../../public/icons/debug.png');
            var iconPath = typeRegistry.getNodeIconPath('unknown-module', 'debug.png');
            should.not.exist(iconPath);
        });
    });

    describe('#getNodeIcons', function() {
        it('returns empty icon list when no modules are registered', function() {
            var iconList = typeRegistry.getNodeIcons();
            iconList.should.eql({});
        });

        it('returns an icon list of registered node module', function() {
            var testIcon = path.resolve(__dirname+'/resources/userDir/lib/icons/');
            typeRegistry.init(settings,{},events);
            typeRegistry.addModule({name: "test-module",version:"0.0.1",nodes: {
                "test-name":{
                    id: "test-module/test-name",
                    module: "test-module",
                    name: "test-name",
                    enabled: true,
                    loaded: false,
                    config: "configA",
                    types: [ "test-a","test-b"],
                    file: "abc"
                }
            },icons: [{path:testIcon,icons:['test_icon.png']}]});
            var iconList = typeRegistry.getNodeIcons();
            iconList.should.eql({"test-module":["test_icon.png"]});
        });
    });

});
