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
var when = require("when");
var clone = require("clone");
var flows = require("../../../../../red/runtime/nodes/flows");
var RedNode = require("../../../../../red/runtime/nodes/Node");
var RED = require("../../../../../red/runtime/nodes");
var events = require("../../../../../red/runtime/events");
var credentials = require("../../../../../red/runtime/nodes/credentials");
var typeRegistry = require("../../../../../red/runtime/nodes/registry");
var Flow = require("../../../../../red/runtime/nodes/flows/Flow");

describe('flows/index', function() {

    var storage;
    var eventsOn;
    var credentialsClean;
    var credentialsLoad;

    var flowCreate;
    var getType;

    before(function() {
        getType = sinon.stub(typeRegistry,"get",function(type) {
            return type.indexOf('missing') === -1;
        });
    });
    after(function() {
        getType.restore();
    });


    beforeEach(function() {
        eventsOn = sinon.spy(events,"on");
        credentialsClean = sinon.stub(credentials,"clean",function(conf) {
            conf.forEach(function(n) {
                delete n.credentials;
            });
            return when.resolve();
        });
        credentialsLoad = sinon.stub(credentials,"load",function() {
            return when.resolve();
        });
        flowCreate = sinon.stub(Flow,"create",function(global, flow) {
            var id;
            if (typeof flow === 'undefined') {
                flow = global;
                id = '_GLOBAL_';
            } else {
                id = flow.id;
            }
            flowCreate.flows[id] = {
                flow: flow,
                global: global,
                start: sinon.spy(),
                update: sinon.spy(),
                stop: sinon.spy(),
                getActiveNodes: function() {
                    return flow.nodes||{};
                },
                handleError: sinon.spy(),
                handleStatus: sinon.spy()

            }
            return flowCreate.flows[id];
        });
        flowCreate.flows = {};

        storage = {
            saveFlows: function(conf) {
                storage.conf = conf;
                return when.resolve();
            }
        }
    });

    afterEach(function(done) {
        eventsOn.restore();
        credentialsClean.restore();
        credentialsLoad.restore();
        flowCreate.restore();

        flows.stopFlows().then(done);

    });
    // describe('#init',function() {
    //     it('registers the type-registered handler', function() {
    //         flows.init({},{});
    //         eventsOn.calledOnce.should.be.true();
    //     });
    // });

    describe('#setFlows', function() {
        it('sets the full flow', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            flows.init({settings:{},storage:storage});
            flows.setFlows(originalConfig).then(function() {
                credentialsClean.called.should.be.true();
                storage.hasOwnProperty('conf').should.be.true();
                flows.getFlows().flows.should.eql(originalConfig);
                done();
            });

        });
        it('loads the full flow for type load', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            var loadStorage = {
                saveFlows: function(conf) {
                    loadStorage.conf = conf;
                    return when.resolve(456);
                },
                getFlows: function() {
                    return when.resolve({flows:originalConfig,rev:123})
                }
            }
            flows.init({settings:{},storage:loadStorage});
            flows.setFlows(originalConfig,"load").then(function() {
                credentialsClean.called.should.be.false();
                // 'load' type does not trigger a save
                loadStorage.hasOwnProperty('conf').should.be.false();
                flows.getFlows().flows.should.eql(originalConfig);
                done();
            });

        });

        it('extracts credentials from the full flow', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[],credentials:{"a":1}},
                {id:"t1",type:"tab"}
            ];
            flows.init({settings:{},storage:storage});
            flows.setFlows(originalConfig).then(function() {
                credentialsClean.called.should.be.true();
                storage.hasOwnProperty('conf').should.be.true();
                var cleanedFlows = flows.getFlows();
                storage.conf.flows.should.eql(cleanedFlows.flows);
                cleanedFlows.flows.should.not.eql(originalConfig);
                cleanedFlows.flows[0].credentials = {"a":1};
                cleanedFlows.flows.should.eql(originalConfig);
                done();
            });
        });

        it('updates existing flows with partial deployment - nodes', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            var newConfig = clone(originalConfig);
            newConfig.push({id:"t1-2",x:10,y:10,z:"t1",type:"test",wires:[]});
            newConfig.push({id:"t2",type:"tab"});
            newConfig.push({id:"t2-1",x:10,y:10,z:"t2",type:"test",wires:[]});
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                flows.setFlows(newConfig,"nodes").then(function() {
                    flows.getFlows().flows.should.eql(newConfig);
                    flowCreate.flows['t1'].update.called.should.be.true();
                    flowCreate.flows['t2'].start.called.should.be.true();
                    flowCreate.flows['_GLOBAL_'].update.called.should.be.true();
                    done();
                })
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });

        it('updates existing flows with partial deployment - flows', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            var newConfig = clone(originalConfig);
            newConfig.push({id:"t1-2",x:10,y:10,z:"t1",type:"test",wires:[]});
            newConfig.push({id:"t2",type:"tab"});
            newConfig.push({id:"t2-1",x:10,y:10,z:"t2",type:"test",wires:[]});
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                flows.setFlows(newConfig,"nodes").then(function() {
                    flows.getFlows().flows.should.eql(newConfig);
                    flowCreate.flows['t1'].update.called.should.be.true();
                    flowCreate.flows['t2'].start.called.should.be.true();
                    flowCreate.flows['_GLOBAL_'].update.called.should.be.true();
                    flows.stopFlows().then(done);
                })
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });

    });

    describe('#load', function() {
        it('loads the flow config', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }
            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                credentialsLoad.called.should.be.true();
                // 'load' type does not trigger a save
                storage.hasOwnProperty('conf').should.be.false();
                flows.getFlows().flows.should.eql(originalConfig);
                done();
            });
        });
    });

    describe('#startFlows', function() {
        it('starts the loaded config', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                Object.keys(flowCreate.flows).should.eql(['_GLOBAL_','t1']);
                done();
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });
        it('does not start if nodes missing', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1-2",x:10,y:10,z:"t1",type:"missing",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
                flowCreate.called.should.be.false();
                done();
            });
        });

        it('starts when missing nodes registered', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1-2",x:10,y:10,z:"t1",type:"missing",wires:[]},
                {id:"t1-3",x:10,y:10,z:"t1",type:"missing2",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }
            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
                flowCreate.called.should.be.false();

                events.emit("type-registered","missing");
                setTimeout(function() {
                    flowCreate.called.should.be.false();
                    events.emit("type-registered","missing2");
                    setTimeout(function() {
                        flowCreate.called.should.be.true();
                        done();
                    },10);
                },10);
            });
        });



    });

    describe.skip('#get',function() {

    });

    describe('#eachNode', function() {
        it('iterates the flow nodes', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }
            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                var c = 0;
                flows.eachNode(function(node) {
                    c++
                })
                c.should.equal(2);
                done();
            });
        });
    });

    describe('#stopFlows', function() {

    });
    describe('#handleError', function() {
        it('passes error to correct flow', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                flows.handleError(originalConfig[0],"message",{});
                flowCreate.flows['t1'].handleError.called.should.be.true();
                done();
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });
        it('passes error to flows that use the originating global config', function(done) {
            var originalConfig = [
                {id:"configNode",type:"test"},
                {id:"t1",type:"tab"},
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",config:"configNode",wires:[]},
                {id:"t2",type:"tab"},
                {id:"t2-1",x:10,y:10,z:"t2",type:"test",wires:[]},
                {id:"t3",type:"tab"},
                {id:"t3-1",x:10,y:10,z:"t3",type:"test",config:"configNode",wires:[]}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                flows.handleError(originalConfig[0],"message",{});
                try {
                    flowCreate.flows['t1'].handleError.called.should.be.true();
                    flowCreate.flows['t2'].handleError.called.should.be.false();
                    flowCreate.flows['t3'].handleError.called.should.be.true();
                    done();
                } catch(err) {
                    done(err);
                }
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });
    });
    describe('#handleStatus', function() {
        it('passes status to correct flow', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                flows.handleStatus(originalConfig[0],"message");
                flowCreate.flows['t1'].handleStatus.called.should.be.true();
                done();
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });

        it('passes status to flows that use the originating global config', function(done) {
            var originalConfig = [
                {id:"configNode",type:"test"},
                {id:"t1",type:"tab"},
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",config:"configNode",wires:[]},
                {id:"t2",type:"tab"},
                {id:"t2-1",x:10,y:10,z:"t2",type:"test",wires:[]},
                {id:"t3",type:"tab"},
                {id:"t3-1",x:10,y:10,z:"t3",type:"test",config:"configNode",wires:[]}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }

            events.once('nodes-started',function() {
                flows.handleStatus(originalConfig[0],"message");
                try {
                    flowCreate.flows['t1'].handleStatus.called.should.be.true();
                    flowCreate.flows['t2'].handleStatus.called.should.be.false();
                    flowCreate.flows['t3'].handleStatus.called.should.be.true();
                    done();
                } catch(err) {
                    done(err);
                }
            });

            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.startFlows();
            });
        });
    });

    describe('#checkTypeInUse', function() {

        before(function() {
            sinon.stub(typeRegistry,"getNodeInfo",function(id) {
                if (id === 'unused-module') {
                    return {types:['one','two','three']}
                } else {
                    return {types:['one','test','three']}
                }
            });
        });

        after(function() {
            typeRegistry.getNodeInfo.restore();
        });

        it('returns cleanly if type not is use', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            flows.init({settings:{},storage:storage});
            flows.setFlows(originalConfig).then(function() {
                flows.checkTypeInUse("unused-module");
                done();
            });
        });
        it('throws error if type is in use', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            flows.init({settings:{},storage:storage});
            flows.setFlows(originalConfig).then(function() {
                /*jshint immed: false */
                try {
                    flows.checkTypeInUse("used-module");
                    done("type_in_use error not thrown");
                } catch(err) {
                    err.code.should.eql("type_in_use");
                    done();
                }
            });
        });
    });

    describe('#addFlow', function() {
        it("rejects duplicate node id",function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }
            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                flows.addFlow({
                    label:'new flow',
                    nodes:[
                        {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]}
                    ]
                }).then(function() {
                    done(new Error('failed to reject duplicate node id'));
                }).otherwise(function(err) {
                    done();
                })
            });

        });

        it("addFlow",function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve({flows:originalConfig});
            }
            storage.setFlows = function() {
                return when.resolve();
            }
            flows.init({settings:{},storage:storage});
            flows.load().then(function() {
                return flows.startFlows();
            }).then(function() {
                flows.addFlow({
                    label:'new flow',
                    nodes:[
                        {id:"t2-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                        {id:"t2-2",x:10,y:10,z:"t1",type:"test",wires:[]}
                        ,
                        {id:"t2-3",z:"t1",type:"test"}
                    ]
                }).then(function(id) {
                    flows.getFlows().flows.should.have.lengthOf(6);
                    var createdFlows = Object.keys(flowCreate.flows);
                    createdFlows.should.have.lengthOf(3);
                    createdFlows[2].should.eql(id);
                    done();
                }).otherwise(function(err) {
                    done(err);
                })
            });

        });
    })
    describe('#updateFlow', function() {
        it.skip("updateFlow");
    })
    describe('#removeFlow', function() {
        it.skip("removeFlow");
    })
    describe('#disableFlow', function() {
        it.skip("disableFlow");
    })
    describe('#enableFlow', function() {
        it.skip("enableFlow");
    })
});
