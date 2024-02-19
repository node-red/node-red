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
var sinon = require("sinon");
var clone = require("clone");
var NR_TEST_UTILS = require("nr-test-utils");
var flowUtil = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/util");
var typeRegistry = NR_TEST_UTILS.require("@node-red/registry");
var redUtil = NR_TEST_UTILS.require("@node-red/util").util;

describe('flows/util', function() {
    var getType;

    before(function() {
        getType = sinon.stub(typeRegistry,"get").callsFake(function(type) {
            return type!=='missing';
        });
    });
    after(function() {
        getType.restore();
    });

    describe('#mapEnvVarProperties',function() {
        before(function() {
            process.env.foo1 = "bar1";
            process.env.foo2 = "bar2";
            process.env.foo3 = "bar3";
        })
        after(function() {
            delete process.env.foo1;
            delete process.env.foo2;
            delete process.env.foo3;
        })
        it('handles ENV substitutions in an object - $()', function() {
            var foo = {a:"$(foo1)",b:"$(foo2)",c:{d:"$(foo3)"}};
            for (var p in foo) {
                if (foo.hasOwnProperty(p)) {
                    flowUtil.mapEnvVarProperties(foo,p,{getSetting: p => process.env[p]});
                }
            }
            foo.should.eql({ a: 'bar1', b: 'bar2', c: { d: 'bar3' } } );
        });
        it('handles ENV substitutions in an object - ${}', function() {
            var foo = {a:"${foo1}",b:"${foo2}",c:{d:"${foo3}"}};
            for (var p in foo) {
                if (foo.hasOwnProperty(p)) {
                    flowUtil.mapEnvVarProperties(foo,p,{getSetting: p => process.env[p]});
                }
            }
            foo.should.eql({ a: 'bar1', b: 'bar2', c: { d: 'bar3' } } );
        });

        it('gets ENV from parent flow', function() {
            var foo = {a:"$(unknown)",b:"$(foo2)",c:{d:"$(foo3)"}};
            for (var p in foo) {
                if (foo.hasOwnProperty(p)) {
                    flowUtil.mapEnvVarProperties(foo,p,{
                        getSetting: name => name[0]==='f'?name.toUpperCase():undefined
                    });
                }
            }
            foo.should.eql({ a: '$(unknown)', b: 'FOO2', c: { d: 'FOO3' } } );
        });
    });
    describe('#getEnvVar',function() {
        before(function() {
            process.env.foo1 = "bar1";
        })
        after(function() {
            delete process.env.foo1;
        })
        it('returns a known env var', function() {
            flowUtil.init({settings:{}});
            flowUtil.getEnvVar("foo1").should.equal("bar1")
        })
        it('returns undefined for an unknown env var', function() {
            flowUtil.init({settings:{}});
            (flowUtil.getEnvVar("foo2") === undefined).should.be.true()
        })
        it('returns undefined for an excluded env var', function() {
            flowUtil.init({settings:{envVarExcludes:['foo1']}});
            (flowUtil.getEnvVar("foo1") === undefined).should.be.true()
        })

    });

    describe('#diffNodes',function() {
        it('handles a null old node', function() {
            flowUtil.diffNodes(null,{}).should.be.true();
        });
        it('ignores x/y changes', function() {
            flowUtil.diffNodes({x:10,y:10},{x:20,y:10}).should.be.false();
            flowUtil.diffNodes({x:10,y:10},{x:10,y:20}).should.be.false();
        });
        it('ignores wiring changes', function() {
            flowUtil.diffNodes({wires:[]},{wires:[1,2,3]}).should.be.false();
        });
        it('spots existing property change - string', function() {
            flowUtil.diffNodes({a:"foo"},{a:"bar"}).should.be.true();
        });
        it('spots existing property change - number', function() {
            flowUtil.diffNodes({a:0},{a:1}).should.be.true();
        });
        it('spots existing property change - boolean', function() {
            flowUtil.diffNodes({a:true},{a:false}).should.be.true();
        });
        it('spots existing property change - truthy', function() {
            flowUtil.diffNodes({a:true},{a:1}).should.be.true();
        });
        it('spots existing property change - falsey', function() {
            flowUtil.diffNodes({a:false},{a:0}).should.be.true();
        });
        it('spots existing property change - array', function() {
            flowUtil.diffNodes({a:[0,1,2]},{a:[0,2,3]}).should.be.true();
        });
        it('spots existing property change - object', function() {
            flowUtil.diffNodes({a:{a:[0,1,2]}},{a:{a:[0,2,3]}}).should.be.true();
            flowUtil.diffNodes({a:{a:[0,1,2]}},{a:{b:[0,1,2]}}).should.be.true();
        });
        it('spots added property', function() {
            flowUtil.diffNodes({a:"foo"},{a:"foo",b:"bar"}).should.be.true();
        });
        it('spots removed property', function() {
            flowUtil.diffNodes({a:"foo",b:"bar"},{a:"foo"}).should.be.true();
        });


    });

    describe('#parseConfig',function() {

        it('parses a single-tab flow', function() {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            var expectedConfig = {"allNodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","wires":[]},"t1":{"id":"t1","type":"tab"}},"subflows":{},"configs":{},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"groups":{},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","wires":[]}}}},"missingTypes":[]};
            parsedConfig.should.eql(expectedConfig);
        });

        it('parses a single-tab flow with global config node', function() {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",foo:"cn", wires:[]},
                {id:"cn",type:"test"},
                {id:"t1",type:"tab"}
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            var expectedConfig = {"allNodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","foo":"cn","wires":[]},"cn":{"id":"cn","type":"test"},"t1":{"id":"t1","type":"tab"}},"subflows":{},"configs":{"cn":{"id":"cn","type":"test","_users":["t1-1"]}},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"groups":{},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","foo":"cn","wires":[]}}}},"missingTypes":[]};
            parsedConfig.should.eql(expectedConfig);
        });

        it('parses a multi-tab flow', function() {
            var originalConfig = [
                {id:"t1",type:"tab"},
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t2",type:"tab"},
                {id:"t2-1",x:10,y:10,z:"t2",type:"test",wires:[]}
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            var expectedConfig = {"allNodes":{"t1":{"id":"t1","type":"tab"},"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","wires":[]},"t2":{"id":"t2","type":"tab"},"t2-1":{"id":"t2-1","x":10,"y":10,"z":"t2","type":"test","wires":[]}},"subflows":{},"configs":{},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"groups":{},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","wires":[]}}},"t2":{"id":"t2","type":"tab","subflows":{},"configs":{},"groups":{},"nodes":{"t2-1":{"id":"t2-1","x":10,"y":10,"z":"t2","type":"test","wires":[]}}}},"missingTypes":[]};
            parsedConfig.should.eql(expectedConfig);
        });

        it('parses a subflow flow', function() {
            var originalConfig = [
                {id:"t1",type:"tab"},
                {id:"t1-1",x:10,y:10,z:"t1",type:"subflow:sf1",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",x:10,y:10,z:"sf1",type:"test",wires:[]}
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            var expectedConfig = {"allNodes":{"t1":{"id":"t1","type":"tab"},"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"subflow:sf1","wires":[]},"sf1":{"id":"sf1","type":"subflow"},"sf1-1":{"id":"sf1-1","x":10,"y":10,"z":"sf1","type":"test","wires":[]}},"subflows":{"sf1":{"id":"sf1","type":"subflow","configs":{},"groups":{},"nodes":{"sf1-1":{"id":"sf1-1","x":10,"y":10,"z":"sf1","type":"test","wires":[]}},"instances":[{"id":"t1-1","x":10,"y":10,"z":"t1","type":"subflow:sf1","wires":[],"subflow":"sf1"}]}},"configs":{},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"groups":{},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"subflow:sf1","wires":[],"subflow":"sf1"}}}},"missingTypes":[]};
            parsedConfig.should.eql(expectedConfig);
        });

        it('parses a flow with a missing type', function() {
            var originalConfig = [
                {id:"t1",type:"tab"},
                {id:"t1-1",x:10,y:10,z:"t1",type:"sf1",wires:[]},
                {id:"t1-2",x:10,y:10,z:"t1",type:"missing",wires:[]},
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            parsedConfig.missingTypes.should.eql(['missing']);
            var expectedConfig = {"allNodes":{"t1":{"id":"t1","type":"tab"},"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"sf1","wires":[]},"t1-2":{"id":"t1-2","x":10,"y":10,"z":"t1","type":"missing","wires":[]}},"subflows":{},"configs":{},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"groups":{},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"sf1","wires":[]},'t1-2': { id: 't1-2', x: 10, y: 10, z: 't1', type: 'missing', wires: [] }}}},"missingTypes":["missing"]};
            redUtil.compareObjects(parsedConfig,expectedConfig).should.be.true();
        });

        it('parses a flow with a missing flow', function() {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",foo:"cn", wires:[]},
                {id:"cn",type:"test"},
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            var expectedConfig = {"allNodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","foo":"cn","wires":[]},"cn":{"id":"cn","type":"test"}},"subflows":{},"configs":{"cn":{"id":"cn","type":"test","_users":["t1-1"]}},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","foo":"cn","wires":[]}}}},"missingTypes":[]};
            parsedConfig.should.eql(expectedConfig);
        });

        it('parses a flow including a group', function() {
            var originalConfig = [
                {id:"t1",type:"tab"},
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"g1",type:"group",z:"t1"}
            ];
            var parsedConfig = flowUtil.parseConfig(originalConfig);
            var expectedConfig = {"allNodes":{"t1":{"id":"t1","type":"tab"},"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","wires":[]},"g1":{"id":"g1","type":"group","z":"t1"}},"subflows":{},"configs":{},"flows":{"t1":{"id":"t1","type":"tab","subflows":{},"configs":{},"groups":{"g1":{"id":"g1","type":"group","z":"t1"}},"nodes":{"t1-1":{"id":"t1-1","x":10,"y":10,"z":"t1","type":"test","wires":[]}}}},"missingTypes":[]}
            parsedConfig.should.eql(expectedConfig);
        });

    });

    describe('#diffConfigs', function() {

        it('handles an identical configuration', function() {
            var config = [{id:"123",type:"test",foo:"a",wires:[]}];

            var originalConfig = flowUtil.parseConfig(clone(config));
            var changedConfig = flowUtil.parseConfig(clone(config));

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);

            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.should.have.length(0);
        });

        it('identifies nodes with changed properties, including downstream linked', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[[1]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[0].foo = "b";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.eql(["1"]);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.should.eql(["2"]);

        });
        it('identifies nodes with changed properties, including upstream linked', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[["1"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].bar = "c";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.eql(["2"]);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.should.eql(["1"]);
        });

        it('identifies nodes with changed credentials, including downstream linked', function() {
            var config = [{id:"1",type:"test",wires:[]},{id:"2",type:"test",bar:"b",wires:[["1"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[0].credentials = {};

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.eql(["1"]);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.should.eql(["2"]);
        });

        it('identifies nodes with changed wiring', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[["1"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0][0] = "3";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.eql(["2"]);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('identifies nodes with changed wiring - second connection added', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"2",type:"test",bar:"b",wires:[["1"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires[0].push("1");

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.eql(["2"]);
            diffResult.linked.sort().should.eql(["1"]);
        });

        it('identifies nodes with changed wiring - node connected', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[["2"]]},{id:"2",type:"test",bar:"b",wires:[[]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig[1].wires.push("3");

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.eql(["2"]);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('identifies new nodes', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig.push({id:"2",type:"test",bar:"b",wires:[["1"]]});

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.eql(["2"]);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1"]);
        });

        it('identifies deleted nodes', function() {
            var config = [{id:"1",type:"test",foo:"a",wires:[["2"]]},{id:"2",type:"test",bar:"b",wires:[["3"]]},{id:"3",type:"test",foo:"a",wires:[]}];
            var newConfig = clone(config);
            newConfig.splice(1,1);
            newConfig[0].wires = [];

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.eql(["2"]);
            diffResult.rewired.should.eql(["1"]);
            diffResult.linked.sort().should.eql(["3"]);
        });

        it('identifies config nodes changes, node->config', function() {
            var config = [
                {id:"1",type:"test",foo:"configNode",wires:[["2"]]},
                {id:"2",type:"test",bar:"b",wires:[["3"]]},
                {id:"3",type:"test",foo:"a",wires:[]},
                {id:"configNode",type:"testConfig"}
            ];
            var newConfig = clone(config);
            newConfig[3].foo = "bar";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(["1","configNode"]);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["2","3"]);
        });

        it('identifies config nodes changes, node->config->config', function() {
            var config = [
                {id:"1",type:"test",foo:"configNode1",wires:[["2"]]},
                {id:"2",type:"test",bar:"b",wires:[["3"]]},
                {id:"3",type:"test",foo:"a",wires:[]},
                {id:"configNode1",foo:"configNode2",type:"testConfig"},
                {id:"configNode2",type:"testConfig"}
            ];
            var newConfig = clone(config);
            newConfig[4].foo = "bar";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(["1","configNode1","configNode2"]);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["2","3"]);
        });

        it('marks a parent subflow as changed for an internal property change', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test",foo:"a",wires:[]},
                {id:"4",type:"subflow:sf1",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[4].foo = "b";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', '4', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);


        });

        it('marks a parent subflow as changed for an internal wiring change', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[4].wires = [["sf1-2"]];

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('marks a parent subflow as changed for an internal node add', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig.push({id:"sf1-3",z:"sf1",type:"test",wires:[]});

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);

        });

        it('marks a parent subflow as changed for an internal node delete', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig.splice(5,1);

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(1);
            diffResult.removed.sort().should.eql(['sf1-2']);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);

        });

        it('marks a parent subflow as changed for an internal subflow wiring change - input removed', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[3].in[0].wires = [];

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('marks a parent subflow as changed for an internal subflow wiring change - input added', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[3].in[0].wires.push({"id":"sf1-2"});

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('marks a parent subflow as changed for an internal subflow wiring change - output added', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[3].out[0].wires.push({"id":"sf1-2","port":0});

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('marks a parent subflow as changed for an internal subflow wiring change - output removed', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow","in": [{"wires": [{"id": "sf1-1"}]}],"out": [{"wires": [{"id": "sf1-2","port": 0}]}]},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[3].out[0].wires = [];

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('marks a parent subflow as changed for a global config node change', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf1-1",z:"sf1",prop:"configNode",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"test",wires:[]},
                {id:"configNode",a:"foo",type:"test",wires:[]}
            ];

            var newConfig = clone(config);
            newConfig[6].a = "bar";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', "configNode", 'sf1']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });

        it('marks a parent subflow as changed for an internal subflow instance change', function() {
            var config = [
                {id:"1",type:"test",wires:[["2"]]},
                {id:"2",type:"subflow:sf1",wires:[["3"]]},
                {id:"3",type:"test",wires:[]},
                {id:"sf1",type:"subflow"},
                {id:"sf2",type:"subflow"},
                {id:"sf1-1",z:"sf1",type:"test",wires:[]},
                {id:"sf1-2",z:"sf1",type:"subflow:sf2",wires:[]},
                {id:"sf2-1",z:"sf2",type:"test",wires:[]},
                {id:"sf2-2",z:"sf2",type:"test",wires:[]},
            ];

            var newConfig = clone(config);
            newConfig[8].a = "bar";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.sort().should.eql(['2', 'sf1', 'sf2']);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
            diffResult.linked.sort().should.eql(["1","3"]);
        });


        it('ignores tab changes that are immaterial', function() {
            var config = [{id:"1",type:"tab",label:"fred"},{id:"2",type:"test",bar:"b",wires:[["1"]],z:"1"}];
            var newConfig = clone(config);
            newConfig[0].label = "barney";

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
        });


        it('marks a deleted tab as removed', function() {
            var config = [{id:"f1",type:"tab",label:"fred"},{id:"n1",type:"test",bar:"b",wires:[["1"]],z:"f1"},
                          {id:"f2",type:"tab",label:"fred"},{id:"n2",type:"test",bar:"b",wires:[["1"]],z:"f2"}];
            var newConfig = clone(config);
            newConfig = newConfig.slice(0,2);

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);
            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.sort().should.eql(['f2', 'n2']);
            diffResult.rewired.should.have.length(0);
        });

        it('marks all nodes as added when tab state changes disabled to enabled', function() {
            var config = [{id:"1",type:"tab",disabled:true,label:"fred"},{id:"2",type:"test",bar:"b",wires:[["1"]],z:"1"},{id:"3",type:"test"}];
            var newConfig = clone(config);
            newConfig[0].disabled = false;

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);

            diffResult.added.should.have.length(2);
            diffResult.added.sort().should.eql(["1","2"]);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(0);
            diffResult.rewired.should.have.length(0);
        });
        it('marks all nodes as removed when tab state changes enabled to disabled', function() {
            var config = [{id:"1",type:"tab",disabled:false,label:"fred"},{id:"2",type:"test",bar:"b",wires:[["1"]],z:"1"},{id:"3",type:"test"}];
            var newConfig = clone(config);
            newConfig[0].disabled = true;

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);

            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(0);
            diffResult.removed.should.have.length(2);
            diffResult.removed.sort().should.eql(["1","2"]);
            diffResult.rewired.should.have.length(0);
        });

        it('marks a node as removed when its state changes enabled to disabled', function() {
            var config = [{id:"1",type:"tab",disabled:false,label:"fred"},{id:"2",type:"test",bar:"b",wires:[["1"]],z:"1"},{id:"3",type:"test"}];
            var newConfig = clone(config);
            newConfig[1].d = true;

            var originalConfig = flowUtil.parseConfig(config);
            var changedConfig = flowUtil.parseConfig(newConfig);

            originalConfig.missingTypes.should.have.length(0);

            var diffResult = flowUtil.diffConfigs(originalConfig,changedConfig);

            diffResult.added.should.have.length(0);
            diffResult.changed.should.have.length(2);
            diffResult.changed.sort().should.eql(["1","2"]);
            diffResult.removed.should.have.length(1);
            diffResult.removed.sort().should.eql(["2"]);
            diffResult.rewired.should.have.length(0);
        });

    });
});
