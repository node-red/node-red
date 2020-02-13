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

var NR_TEST_UTILS = require("nr-test-utils");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/api/flows")

var mockLog = () => ({
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
})

describe("runtime-api/flows", function() {
    describe("getFlows", function() {
        it("returns the current flow configuration", function(done) {
            flows.init({
                log: mockLog(),
                nodes: {
                    getFlows: function() { return [1,2,3] }
                }
            });
            flows.getFlows({}).then(function(result) {
                result.should.eql([1,2,3]);
                done();
            }).catch(done);
        });
    });

    describe("setFlows", function() {
        var setFlows;
        var loadFlows;
        var reloadError = false;
        beforeEach(function() {
            setFlows = sinon.spy(function(flows,credentials,type) {
                if (flows[0] === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
                return Promise.resolve("newRev");
            });
            loadFlows = sinon.spy(function() {
                if (!reloadError) {
                    return Promise.resolve("newLoadRev");
                } else {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
            })
            flows.init({
                log: mockLog(),
                nodes: {
                    getFlows: function() { return {rev:"currentRev",flows:[]} },
                    setFlows: setFlows,
                    loadFlows: loadFlows
                }
            })

        })
        it("defaults to full deploy", function(done) {
            flows.setFlows({
                flows: {flows:[4,5,6]}
            }).then(function(result) {
                result.should.eql({rev:"newRev"});
                setFlows.called.should.be.true();
                setFlows.lastCall.args[0].should.eql([4,5,6]);
                setFlows.lastCall.args[2].should.eql("full");
                done();
            }).catch(done);
        });
        it("includes credentials when part of the request", function(done) {
            flows.setFlows({
                flows: {flows:[4,5,6], credentials: {$:"creds"}},
            }).then(function(result) {
                result.should.eql({rev:"newRev"});
                setFlows.called.should.be.true();
                setFlows.lastCall.args[0].should.eql([4,5,6]);
                setFlows.lastCall.args[1].should.eql({$:"creds"});
                setFlows.lastCall.args[2].should.eql("full");
                done();
            }).catch(done);
        });
        it("passes through other deploy types", function(done) {
            flows.setFlows({
                deploymentType: "nodes",
                flows: {flows:[4,5,6]}
            }).then(function(result) {
                result.should.eql({rev:"newRev"});
                setFlows.called.should.be.true();
                setFlows.lastCall.args[0].should.eql([4,5,6]);
                setFlows.lastCall.args[2].should.eql("nodes");
                done();
            }).catch(done);
        });
        it("triggers a flow reload", function(done) {
            flows.setFlows({
                deploymentType: "reload"
            }).then(function(result) {
                result.should.eql({rev:"newLoadRev"});
                setFlows.called.should.be.false();
                loadFlows.called.should.be.true();
                done();
            }).catch(done);
        });
        it("allows update when revision matches", function(done) {
            flows.setFlows({
                deploymentType: "nodes",
                flows: {flows:[4,5,6],rev:"currentRev"}
            }).then(function(result) {
                result.should.eql({rev:"newRev"});
                setFlows.called.should.be.true();
                setFlows.lastCall.args[0].should.eql([4,5,6]);
                setFlows.lastCall.args[2].should.eql("nodes");
                done();
            }).catch(done);
        });
        it("rejects update when revision does not match", function(done) {
            flows.setFlows({
                deploymentType: "nodes",
                flows: {flows:[4,5,6],rev:"notTheCurrentRev"}
            }).then(function(result) {
                done(new Error("Did not reject rev mismatch"));
            }).catch(function(err) {
                err.should.have.property('code','version_mismatch');
                err.should.have.property('status',409);
                done();
            }).catch(done);
        });
        it("rejects when reload fails",function(done) {
            reloadError = true;
            flows.setFlows({
                deploymentType: "reload"
            }).then(function(result) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                done();
            }).catch(done);
        });
        it("rejects when update fails",function(done) {
            flows.setFlows({
                deploymentType: "full",
                flows: {flows:["error",5,6]}
            }).then(function(result) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                done();
            }).catch(done);
        });
    });

    describe("addFlow", function() {
        var addFlow;
        beforeEach(function() {
            addFlow = sinon.spy(function(flow) {
                if (flow === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
                return Promise.resolve("newId");
            });
            flows.init({
                log: mockLog(),
                nodes: {
                    addFlow: addFlow
                }
            });
        })
        it("adds a flow", function(done) {
            flows.addFlow({flow:{a:"123"}}).then(function(id) {
                addFlow.called.should.be.true();
                addFlow.lastCall.args[0].should.eql({a:"123"});
                id.should.eql("newId");
                done()
            }).catch(done);
        });
        it("rejects when add fails", function(done) {
            flows.addFlow({flow:"error"}).then(function(id) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                done();
            }).catch(done);
        });
    });
    describe("getFlow", function() {
        var getFlow;
        beforeEach(function() {
            getFlow = sinon.spy(function(flow) {
                if (flow === "unknown") {
                    return null;
                }
                return [1,2,3];
            });
            flows.init({
                log: mockLog(),
                nodes: {
                    getFlow: getFlow
                }
            });
        })
        it("gets a flow", function(done) {
            flows.getFlow({id:"123"}).then(function(flow) {
                flow.should.eql([1,2,3]);
                done()
            }).catch(done);
        });
        it("rejects when flow not found", function(done) {
            flows.getFlow({id:"unknown"}).then(function(flow) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','not_found');
                err.should.have.property('status',404);
                done();
            }).catch(done);
        });
    });

    describe("updateFlow", function() {
        var updateFlow;
        beforeEach(function() {
            updateFlow = sinon.spy(function(id,flow) {
                if (id === "unknown") {
                    var err = new Error();
                    // TODO: quirk of internal api - uses .code for .status
                    err.code = 404;
                    throw err;
                } else if (id === "error") {
                    var err = new Error();
                    // TODO: quirk of internal api - uses .code for .status
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
                return Promise.resolve();
            });
            flows.init({
                log: mockLog(),
                nodes: {
                    updateFlow: updateFlow
                }
            });
        })
        it("updates a flow", function(done) {
            flows.updateFlow({id:"123",flow:[1,2,3]}).then(function(id) {
                id.should.eql("123");
                updateFlow.called.should.be.true();
                updateFlow.lastCall.args[0].should.eql("123");
                updateFlow.lastCall.args[1].should.eql([1,2,3]);
                done()
            }).catch(done);
        });
        it("rejects when flow not found", function(done) {
            flows.updateFlow({id:"unknown"}).then(function(flow) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','not_found');
                err.should.have.property('status',404);
                done();
            }).catch(done);
        });
        it("rejects when update fails", function(done) {
            flows.updateFlow({id:"error"}).then(function(flow) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });


    describe("deleteFlow", function() {
        var removeFlow;
        beforeEach(function() {
            removeFlow = sinon.spy(function(flow) {
                if (flow === "unknown") {
                    var err = new Error();
                    // TODO: quirk of internal api - uses .code for .status
                    err.code = 404;
                    throw err;
                } else if (flow === "error") {
                    var err = new Error();
                    // TODO: quirk of internal api - uses .code for .status
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
                return Promise.resolve();
            });
            flows.init({
                log: mockLog(),
                nodes: {
                    removeFlow: removeFlow
                }
            });
        })
        it("deletes a flow", function(done) {
            flows.deleteFlow({id:"123"}).then(function() {
                removeFlow.called.should.be.true();
                removeFlow.lastCall.args[0].should.eql("123");
                done()
            }).catch(done);
        });
        it("rejects when flow not found", function(done) {
            flows.deleteFlow({id:"unknown"}).then(function(flow) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','not_found');
                err.should.have.property('status',404);
                done();
            }).catch(done);
        });
        it("rejects when delete fails", function(done) {
            flows.deleteFlow({id:"error"}).then(function(flow) {
                done(new Error("Did not return internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getNodeCredentials", function() {
        beforeEach(function() {
            flows.init({
                log: mockLog(),
                nodes: {
                    getCredentials: function(id) {
                        if (id === "unknown") {
                            return undefined;
                        } else if (id === "known") {
                            return {
                                username: "abc",
                                password: "123"
                            }
                        } else if (id === "known2") {
                            return {
                                username: "abc",
                                password: ""
                            }
                        } else {
                            return {};
                        }
                    },
                    getCredentialDefinition: function(type) {
                        if (type === "node") {
                            return {
                                username: {type:"text"},
                                password: {type:"password"}
                            }
                        } else {
                            return null;
                        }
                    }
                }
            });
        })
        it("returns an empty object for an unknown node", function(done) {
            flows.getNodeCredentials({id:"unknown", type:"node"}).then(function(result) {
                result.should.eql({});
                done();
            }).catch(done);
        });
        it("gets the filtered credentials for a known node with password", function(done) {
            flows.getNodeCredentials({id:"known", type:"node"}).then(function(result) {
                result.should.eql({
                    username: "abc",
                    has_password: true
                });
                done();
            }).catch(done);
        });
        it("gets the filtered credentials for a known node without password", function(done) {
            flows.getNodeCredentials({id:"known2", type:"node"}).then(function(result) {
                result.should.eql({
                    username: "abc",
                    has_password: false
                });
                done();
            }).catch(done);
        });
        it("gets the empty credentials for a known node without a registered definition", function(done) {
            flows.getNodeCredentials({id:"known2", type:"unknown-type"}).then(function(result) {
                result.should.eql({});
                done();
            }).catch(done);
        });
    });

});
