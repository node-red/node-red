/**
 * Copyright 2014 IBM Corp.
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
var request = require('supertest');
var express = require('express');
var sinon = require('sinon');
var when = require('when');

var redNodes = require("../../../red/nodes");
var server = require("../../../red/server");
var settings = require("../../../red/settings");

var nodes = require("../../../red/api/nodes");

describe("nodes api", function() {

    var app;

    before(function() {
        app = express();
        app.use(express.json());
        app.get("/nodes",nodes.getAll);
        app.post("/nodes",nodes.post);
        app.get("/nodes/:mod",nodes.getModule);
        app.get("/nodes/:mod/:set",nodes.getSet);
        app.put("/nodes/:mod",nodes.putModule);
        app.put("/nodes/:mod/:set",nodes.putSet);
        app.delete("/nodes/:id",nodes.delete);
    });

    describe('get nodes', function() {
        it('returns node list', function(done) {
            var getNodeList = sinon.stub(redNodes,'getNodeList', function() {
                return [1,2,3];
            });
            request(app)
                .get('/nodes')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    getNodeList.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.be.an.Array.and.have.lengthOf(3);
                    done();
                });
        });

        it('returns node configs', function(done) {
            var getNodeConfigs = sinon.stub(redNodes,'getNodeConfigs', function() {
                return "<script></script>";
            });
            request(app)
                .get('/nodes')
                .set('Accept', 'text/html')
                .expect(200)
                .expect("<script></script>")
                .end(function(err,res) {
                    getNodeConfigs.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns node module info', function(done) {
            var getNodeInfo = sinon.stub(redNodes,'getModuleInfo', function(id) {
                return {"node-red":{name:"node-red"}}[id];
            });
            request(app)
                .get('/nodes/node-red')
                .expect(200)
                .end(function(err,res) {
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name","node-red");
                    done();
                });
        });

        it('returns 404 for unknown module', function(done) {
            var getNodeInfo = sinon.stub(redNodes,'getModuleInfo', function(id) {
                return {"node-red":{name:"node-red"}}[id];
            });
            request(app)
                .get('/nodes/node-blue')
                .expect(404)
                .end(function(err,res) {
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns individual node info', function(done) {
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo', function(id) {
                return {"node-red/123":{id:"node-red/123"}}[id];
            });
            request(app)
                .get('/nodes/node-red/123')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","node-red/123");
                    done();
                });
        });

        it('returns individual node configs', function(done) {
            var getNodeConfig = sinon.stub(redNodes,'getNodeConfig', function(id) {
                return {"node-red/123":"<script></script>"}[id];
            });
            request(app)
                .get('/nodes/node-red/123')
                .set('Accept', 'text/html')
                .expect(200)
                .expect("<script></script>")
                .end(function(err,res) {
                    getNodeConfig.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns 404 for unknown node', function(done) {
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo', function(id) {
                return {"node-red/123":{id:"node-red/123"}}[id];
            });
            request(app)
                .get('/nodes/node-red/456')
                .set('Accept', 'application/json')
                .expect(404)
                .end(function(err,res) {
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
    });

    describe('install', function() {

        it('returns 400 if settings are unavailable', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return false;
            });
            request(app)
                .post('/nodes')
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns 400 if request is invalid', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            request(app)
                .post('/nodes')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        describe('by module', function() {
            it('installs the module and returns module info', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo');
                getModuleInfo.onCall(0).returns(null);
                getModuleInfo.onCall(1).returns({
                    name:"foo",
                    nodes:[{id:"123"}]
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    return when.resolve({id:"123"});
                });

                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.body.should.have.property("name","foo");
                        res.body.should.have.property("nodes");
                        res.body.nodes[0].should.have.property("id","123");
                        done();
                    });
            });

            it('fails the install if already installed', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return {nodes:{id:"123"}};
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    return when.resolve({id:"123"});
                });

                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(400)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });

            it('fails the install if module error', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return null;
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    return when.reject(new Error("test error"));
                });

                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(400)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.body.should.have.property("message","Error: test error");
                        done();
                    });
            });
            it('fails the install if module not found', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return null;
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    var err = new Error("test error");
                    err.code = 404;
                    return when.reject(err);
                });

                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(404)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });
        });
    });
    describe('delete', function() {
         it('returns 400 if settings are unavailable', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return false;
            });
            request(app)
                .del('/nodes/123')
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        describe('by module', function() {
            it('uninstalls the module', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return null;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return {nodes:[{id:"123"}]};
                });
                var uninstallModule = sinon.stub(server,'uninstallModule', function() {
                    return when.resolve({id:"123"});
                });

                request(app)
                    .del('/nodes/foo')
                    .expect(204)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        getModuleInfo.restore();
                        uninstallModule.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });

            it('fails the uninstall if the module is not installed', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return null;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return null;
                });

                request(app)
                    .del('/nodes/foo')
                    .expect(404)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        getModuleInfo.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });

            it('fails the uninstall if the module is not installed', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return null;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return {nodes:[{id:"123"}]};
                });
                var uninstallModule = sinon.stub(server,'uninstallModule', function() {
                    return when.reject(new Error("test error"));
                });

                request(app)
                    .del('/nodes/foo')
                    .expect(400)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        getModuleInfo.restore();
                        uninstallModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.body.should.have.property("message","Error: test error");
                        done();
                    });
            });
        });

    });

    describe('enable/disable', function() {
        it('returns 400 if settings are unavailable', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return false;
            });
            request(app)
                .put('/nodes/123')
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns 400 for invalid node payload', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });

            request(app)
                .put('/nodes/node-red/foo')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("message","Invalid request");
                    done();
                });
        });

        it('returns 400 for invalid module payload', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });

            request(app)
                .put('/nodes/foo')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("message","Invalid request");

                    done();
                });
        });

        it('returns 404 for unknown node', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                return null;
            });

            request(app)
                .put('/nodes/node-red/foo')
                .send({enabled:false})
                .expect(404)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns 404 for unknown module', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                return null;
            });

            request(app)
                .put('/nodes/node-blue')
                .send({enabled:false})
                .expect(404)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getModuleInfo.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('enables disabled node', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                return {id:"123",enabled: false};
            });
            var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                return when.resolve({id:"123",enabled: true,types:['a']});
            });

            request(app)
                .put('/nodes/node-red/foo')
                .send({enabled:true})
                .expect(200)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getNodeInfo.restore();
                    enableNode.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","123");
                    res.body.should.have.property("enabled",true);

                    done();
                });
        });

        it('disables enabled node', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                return {id:"123",enabled: true};
            });
            var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                return when.resolve({id:"123",enabled: false,types:['a']});
            });

            request(app)
                .put('/nodes/node-red/foo')
                .send({enabled:false})
                .expect(200)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getNodeInfo.restore();
                    disableNode.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","123");
                    res.body.should.have.property("enabled",false);

                    done();
                });
        });

        describe('no-ops if already in the right state', function() {
            function run(state,done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return {id:"123",enabled: state};
                });
                var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                    return when.resolve({id:"123",enabled: true,types:['a']});
                });

                var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                    return when.resolve({id:"123",enabled: false,types:['a']});
                });

                request(app)
                    .put('/nodes/node-red/foo')
                    .send({enabled:state})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        var enableNodeCalled = enableNode.called;
                        var disableNodeCalled = disableNode.called;
                        enableNode.restore();
                        disableNode.restore();
                        if (err) {
                            throw err;
                        }
                        enableNodeCalled.should.be.false;
                        disableNodeCalled.should.be.false;
                        res.body.should.have.property("id","123");
                        res.body.should.have.property("enabled",state);

                        done();
                    });
            }
            it('already enabled', function(done) {
                run(true,done);
            });
            it('already disabled', function(done) {
                run(false,done);
            });
        });

        describe('does not no-op if err on node', function() {
            function run(state,done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return {id:"123",enabled: state, err:"foo" };
                });
                var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                    return when.resolve({id:"123",enabled: true,types:['a']});
                });

                var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                    return when.resolve({id:"123",enabled: false,types:['a']});
                });

                request(app)
                    .put('/nodes/node-red/foo')
                    .send({enabled:state})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        var enableNodeCalled = enableNode.called;
                        var disableNodeCalled = disableNode.called;
                        enableNode.restore();
                        disableNode.restore();
                        if (err) {
                            throw err;
                        }
                        enableNodeCalled.should.be.equal(state);
                        disableNodeCalled.should.be.equal(!state);
                        res.body.should.have.property("id","123");
                        res.body.should.have.property("enabled",state);

                        done();
                    });
            }
            it('already enabled', function(done) {
                run(true,done);
            });
            it('already disabled', function(done) {
                run(false,done);
            });
        });

        it('enables disabled module', function(done) {
            var n1 = {id:"123",enabled:false,types:['a']};
            var n2 = {id:"456",enabled:false,types:['b']};
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(name) {
                return {name:"node-red", nodes:[n1, n2]};
            });

            var enableNode = sinon.stub(redNodes,'enableNode');
            enableNode.onFirstCall().returns((function() {
                n1.enabled = true;
                return when.resolve(n1);
            })());
            enableNode.onSecondCall().returns((function() {
                n2.enabled = true;
                return when.resolve(n2);
            })());
            enableNode.returns(null);

            request(app)
                .put('/nodes/node-red')
                .send({enabled:true})
                .expect(200)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getModuleInfo.restore();
                    enableNode.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name","node-red");
                    res.body.should.have.property("nodes");
                    res.body.nodes[0].should.have.property("enabled",true);
                    res.body.nodes[1].should.have.property("enabled",true);

                    done();
                });
        });

        it('disables enabled module', function(done) {
            var n1 = {id:"123",enabled:true,types:['a']};
            var n2 = {id:"456",enabled:true,types:['b']};
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(name) {
                return {name:"node-red", nodes:[n1, n2]};
            });

            var disableNode = sinon.stub(redNodes,'disableNode');
            disableNode.onFirstCall().returns((function() {
                n1.enabled = false;
                return when.resolve(n1);
            })());
            disableNode.onSecondCall().returns((function() {
                n2.enabled = false;
                return when.resolve(n2);
            })());
            disableNode.returns(null);

            request(app)
                .put('/nodes/node-red')
                .send({enabled:false})
                .expect(200)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getModuleInfo.restore();
                    disableNode.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name","node-red");
                    res.body.should.have.property("nodes");
                    res.body.nodes[0].should.have.property("enabled",false);
                    res.body.nodes[1].should.have.property("enabled",false);

                    done();
                });
        });

        describe('no-ops if a node in module already in the right state', function() {
            function run(state,done) {
                var node = {id:"123",enabled:state,types:['a']};
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return {name:"node-red", nodes:[node]};
                });
                var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                    node.enabled = true;
                    return when.resolve(node);
                });
                var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                    node.enabled = false;
                    return when.resolve(node);
                });

                request(app)
                    .put('/nodes/node-red')
                    .send({enabled:state})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getModuleInfo.restore();
                        var enableNodeCalled = enableNode.called;
                        var disableNodeCalled = disableNode.called;
                        enableNode.restore();
                        disableNode.restore();
                        if (err) {
                            throw err;
                        }
                        enableNodeCalled.should.be.false;
                        disableNodeCalled.should.be.false;
                        res.body.should.have.property("name","node-red");
                        res.body.should.have.property("nodes");
                        res.body.nodes[0].should.have.property("enabled",state);

                        done();
                    });
            }
            it('already enabled', function(done) {
                run(true,done);
            });
            it('already disabled', function(done) {
                run(false,done);
            });
        });

        describe('does not no-op if err on a node in module', function() {
            function run(state,done) {
                var node = {id:"123",enabled:state,types:['a'],err:"foo"};
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getModuleInfo = sinon.stub(redNodes,'getModuleInfo',function(id) {
                    return {name:"node-red", nodes:[node]};
                });
                var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                    node.enabled = true;
                    return when.resolve(node);
                });
                var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                    node.enabled = false;
                    return when.resolve(node);
                });

                request(app)
                    .put('/nodes/node-red')
                    .send({enabled:state})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getModuleInfo.restore();
                        var enableNodeCalled = enableNode.called;
                        var disableNodeCalled = disableNode.called;
                        enableNode.restore();
                        disableNode.restore();
                        if (err) {
                            throw err;
                        }
                        enableNodeCalled.should.be.equal(state);
                        disableNodeCalled.should.be.equal(!state);
                        res.body.should.have.property("name","node-red");
                        res.body.should.have.property("nodes");
                        res.body.nodes[0].should.have.property("enabled",state);

                        done();
                    });
            }
            it('already enabled', function(done) {
                run(true,done);
            });
            it('already disabled', function(done) {
                run(false,done);
            });
        });
    });


});
