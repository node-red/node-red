/**
 * Copyright 2014, 2015 IBM Corp.
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
var flows = require("../../../../red/nodes/flows");
var RedNode = require("../../../../red/nodes/Node");
var RED = require("../../../../red/nodes");
var events = require("../../../../red/events");
var credentials = require("../../../../red/nodes/credentials");
var typeRegistry = require("../../../../red/nodes/registry");
var Flow = require("../../../../red/nodes/flows/Flow");

var settings = {
    available: function() { return false; }
}

function loadFlows(testFlows, cb) {
    var storage = {
        getFlows: function() {
            return when.resolve(testFlows);
        },
        getCredentials: function() {
            return when.resolve({});
        }
    };
    RED.init(settings, storage);
    flows.load().then(function() {
        should.deepEqual(testFlows, flows.getFlows());
        cb();
    });
}

describe('flows/index', function() {

    var eventsOn;
    var storage;
    var credentialsExtract;
    var credentialsSave;
    var credentialsClean;
    var credentialsLoad;

    var flowCreate;
    var getType;

    before(function() {
        getType = sinon.stub(typeRegistry,"get",function(type) {
            return type!=='missing';
        });
    });
    after(function() {
        getType.restore();
    });


    beforeEach(function() {
        eventsOn = sinon.stub(events,"on",function(evt,handler) {});
        credentialsExtract = sinon.stub(credentials,"extract",function(conf) {
            delete conf.credentials;
        });
        credentialsSave = sinon.stub(credentials,"save",function() {
            return when.resolve();
        });
        credentialsClean = sinon.stub(credentials,"clean",function(conf) {
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
                start: sinon.spy(),
                update: sinon.spy(),
                stop: sinon.spy()
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

    afterEach(function() {
        eventsOn.restore();
        credentialsExtract.restore();
        credentialsSave.restore();
        credentialsClean.restore();
        credentialsLoad.restore();
        flowCreate.restore();
    });
    describe('#init',function() {
        it('registers the type-registered handler', function() {
            flows.init({},{});
            eventsOn.calledOnce.should.be.true;
        });
    });

    describe('#setFlows', function() {
        it('sets the full flow', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            flows.init({},storage);
            flows.setFlows(originalConfig).then(function() {
                credentialsExtract.called.should.be.false;
                credentialsClean.called.should.be.true;
                storage.hasOwnProperty('conf').should.be.true;
                flows.getFlows().should.eql(originalConfig);
                done();
            });

        });
        it('sets the full flow for type load', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            flows.init({},storage);
            flows.setFlows(originalConfig,"load").then(function() {
                credentialsExtract.called.should.be.false;
                credentialsClean.called.should.be.true;
                // 'load' type does not trigger a save
                storage.hasOwnProperty('conf').should.be.false;
                flows.getFlows().should.eql(originalConfig);
                done();
            });

        });

        it('extracts credentials from the full flow', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[],credentials:{}},
                {id:"t1",type:"tab"}
            ];
            flows.init({},storage);
            flows.setFlows(originalConfig).then(function() {
                credentialsExtract.called.should.be.true;
                credentialsClean.called.should.be.true;
                storage.hasOwnProperty('conf').should.be.true;
                var cleanedFlows = flows.getFlows();
                cleanedFlows.should.not.eql(originalConfig);
                cleanedFlows[0].credentials = {};
                cleanedFlows.should.eql(originalConfig);
                done();
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
                return when.resolve(originalConfig);
            }
            flows.init({},storage);
            flows.load().then(function() {
                credentialsExtract.called.should.be.false;
                credentialsLoad.called.should.be.true;
                credentialsClean.called.should.be.true;
                // 'load' type does not trigger a save
                storage.hasOwnProperty('conf').should.be.false;
                flows.getFlows().should.eql(originalConfig);
                done();
            });

        });
    });

    describe('#startFlows', function() {
        it.skip('starts the loaded config', function(done) {
            var originalConfig = [
                {id:"t1-1",x:10,y:10,z:"t1",type:"test",wires:[]},
                {id:"t1",type:"tab"}
            ];
            storage.getFlows = function() {
                return when.resolve(originalConfig);
            }
            flows.init({},storage);
            flows.load().then(function() {
                flows.startFlows();
                // TODO: PICK IT UP FROM HERE
                done();
            });
        });
    });

    describe('#get',function() {

    });

    describe('#eachNode', function() {

    });

    describe('#stopFlows', function() {

    });
    describe('#handleError', function() {

    });
    describe('#handleStatus', function() {

    });
});

    // afterEach(function(done) {
    //     flows.stopFlows().then(function() {
    //         loadFlows([],done);
    //     });
    // });

    // describe('#load',function() {
    //
    //     it('should load nothing when storage is empty',function(done) {
    //         loadFlows([], done);
    //     });
    //
    //     it.skip('should load and start an empty tab flow',function(done) {
    //         events.once('nodes-started', function() { done(); });
    //         loadFlows([{"type":"tab","id":"tab1","label":"Sheet 1"}], function() {});
    //     });
    //
    //     it.skip('should load and start a registered node type', function(done) {
    //         RED.registerType('debug', function() {});
    //         var typeRegistryGet = sinon.stub(typeRegistry,"get",function(nt) {
    //             return RedNode;
    //         });
    //         loadFlows([{"id":"n1","type":"debug"}], function() { });
    //         events.once('nodes-started', function() {
    //             typeRegistryGet.restore();
    //             done();
    //         });
    //     });
    //
    //     it.skip('should load and start when node type is registered', function(done) {
    //         var typeRegistryGet = sinon.stub(typeRegistry,"get");
    //         typeRegistryGet.onCall(0).returns(null);
    //         typeRegistryGet.returns(RedNode);
    //         loadFlows([{"id":"n2","type":"inject"}], function() {
    //             events.emit('type-registered','inject');
    //         });
    //         events.once('nodes-started', function() {
    //             typeRegistryGet.restore();
    //             done();
    //         });
    //     });
    //
    //     it.skip('should not instantiate nodes of an unused subflow', function(done) {
    //         RED.registerType('abc', function() {});
    //         var typeRegistryGet = sinon.stub(typeRegistry,"get",function(nt) {
    //             return RedNode;
    //         });
    //         loadFlows([{"id":"n1","type":"subflow",inputs:[],outputs:[],wires:[]},
    //                    {"id":"n2","type":"abc","z":"n1",wires:[]}
    //                   ],function() { });
    //         events.once('nodes-started', function() {
    //             (flows.get("n2") == null).should.be.true;
    //             var ncount = 0
    //             flows.eachNode(function(n) {
    //                 ncount++;
    //             });
    //             ncount.should.equal(0);
    //             typeRegistryGet.restore();
    //             done();
    //         });
    //     });
    //     it.skip('should instantiate nodes of an used subflow with new IDs', function(done) {
    //         RED.registerType('abc', function() {});
    //         var typeRegistryGet = sinon.stub(typeRegistry,"get",function(nt) {
    //             return RedNode;
    //         });
    //         loadFlows([{"id":"n1","type":"subflow",inputs:[],outputs:[]},
    //                    {"id":"n2","type":"abc","z":"n1","name":"def",wires:[]},
    //                    {"id":"n3","type":"subflow:n1"}
    //                   ], function() { });
    //         events.once('nodes-started', function() {
    //             // n2 should not get instantiated with that id
    //             (flows.get("n2") == null).should.be.true;
    //             var ncount = 0
    //             var nodes = [];
    //             flows.eachNode(function(n) {
    //                 nodes.push(n);
    //             });
    //             nodes.should.have.lengthOf(2);
    //
    //             // Assume the nodes are instantiated in this order - not
    //             // a requirement, but makes the test easier to write.
    //             nodes[0].should.have.property("id","n3");
    //             nodes[0].should.have.property("type","subflow:n1");
    //             nodes[1].should.not.have.property("id","n2");
    //             nodes[1].should.have.property("name","def");
    //
    //             // TODO: verify instance wiring is correct
    //             typeRegistryGet.restore();
    //             done();
    //         });
    //     });
    // });
    //
    // describe.skip('#setFlows',function() {
    //     var credentialsExtact;
    //     var credentialsSave;
    //     var stopFlows;
    //     var startFlows;
    //     var credentialsExtractNode;
    //     beforeEach(function() {
    //         credentialsExtact = sinon.stub(credentials,"extract",function(node) {credentialsExtractNode = clone(node);delete node.credentials;});
    //         credentialsSave = sinon.stub(credentials,"save",function() { return when.resolve();});
    //         stopFlows = sinon.stub(flows,"stopFlows",function() {return when.resolve();});
    //         startFlows = sinon.stub(flows,"startFlows",function() {});
    //     });
    //     afterEach(function() {
    //         credentialsExtact.restore();
    //         credentialsSave.restore();
    //         startFlows.restore();
    //         stopFlows.restore();
    //     });
    //
    //     it('should extract credentials from nodes', function(done) {
    //         var testFlow = [{"type":"testNode","credentials":{"a":1}},{"type":"testNode2"}];
    //         var resultFlow = clone(testFlow);
    //         var storage = { saveFlows: sinon.spy() };
    //         flows.init({},storage);
    //         flows.setFlows(testFlow,"full").then(function() {
    //             try {
    //                 credentialsExtact.calledOnce.should.be.true;
    //                 // credential property stripped
    //                 testFlow.should.not.have.property("credentials");
    //                 credentialsExtractNode.should.eql(resultFlow[0]);
    //                 credentialsExtractNode.should.not.equal(resultFlow[0]);
    //
    //                 credentialsSave.calledOnce.should.be.true;
    //
    //                 storage.saveFlows.calledOnce.should.be.true;
    //                 storage.saveFlows.args[0][0].should.eql(testFlow);
    //
    //                 stopFlows.calledOnce.should.be.true;
    //                 startFlows.calledOnce.should.be.true;
    //
    //                 done();
    //             } catch(err) {
    //                 done(err);
    //             }
    //         });
    //     });
    //
    //     it('should apply diff on partial deployment', function(done) {
    //         var testFlow = [{"type":"testNode"},{"type":"testNode2"}];
    //         var testFlow2 = [{"type":"testNode3"},{"type":"testNode4"}];
    //         var storage = { saveFlows: sinon.spy() };
    //         flows.init({},storage);
    //
    //         flows.setFlows(testFlow,"full").then(function() {
    //             flows.setFlows(testFlow2,"nodes").then(function() {
    //                 try {
    //                     credentialsExtact.called.should.be.false;
    //
    //                     storage.saveFlows.calledTwice.should.be.true;
    //                     storage.saveFlows.args[1][0].should.eql(testFlow2);
    //
    //                     stopFlows.calledTwice.should.be.true;
    //                     startFlows.calledTwice.should.be.true;
    //
    //                     var configDiff = {
    //                         type: 'nodes',
    //                         stop: [],
    //                         rewire: [],
    //                         config: testFlow2
    //                     }
    //                     stopFlows.args[1][0].should.eql(configDiff);
    //                     startFlows.args[1][0].should.eql(configDiff);
    //
    //                     done();
    //                 } catch(err) {
    //                     done(err);
    //                 }
    //             });
    //         });
    //     });
    //
    //
    // });
