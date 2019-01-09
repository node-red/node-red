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
var request = require("supertest");
var express = require("express");

var NR_TEST_UTILS = require("nr-test-utils");

var adminApi = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin");
var auth = NR_TEST_UTILS.require("@node-red/editor-api/lib/auth");
var nodes = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/nodes");
var flows = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/flows");
var flow = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/flow");
var context = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/context");

/**
* Ensure all API routes are correctly mounted, with the expected permissions checks
*/
describe("api/admin/index", function() {
    describe("Ensure all API routes are correctly mounted, with the expected permissions checks", function() {
        var app;
        var mockList = [
            flows,flow,nodes,context
        ];
        var permissionChecks = {};
        var lastRequest;
        var stubApp = function(req,res,next) {
            lastRequest = req;
            res.status(200).end();
        };
        before(function() {
            mockList.forEach(function(m) {
                sinon.stub(m,"init",function(){});
            });
            sinon.stub(auth,"needsPermission", function(permission) {
                return function(req,res,next) {
                    permissionChecks[permission] = (permissionChecks[permission]||0)+1;
                    next();
                };
            });

            sinon.stub(flows,"get",stubApp);
            sinon.stub(flows,"post",stubApp);

            sinon.stub(flow,"get",stubApp);
            sinon.stub(flow,"post",stubApp);
            sinon.stub(flow,"delete",stubApp);
            sinon.stub(flow,"put",stubApp);

            sinon.stub(nodes,"getAll",stubApp);
            sinon.stub(nodes,"post",stubApp);
            sinon.stub(nodes,"getModule",stubApp);
            sinon.stub(nodes,"putModule",stubApp);
            sinon.stub(nodes,"delete",stubApp);
            sinon.stub(nodes,"getSet",stubApp);
            sinon.stub(nodes,"putSet",stubApp);
            sinon.stub(nodes,"getModuleCatalog",stubApp);
            sinon.stub(nodes,"getModuleCatalogs",stubApp);

            sinon.stub(context,"get",stubApp);
            sinon.stub(context,"delete",stubApp);
        });
        after(function() {
            mockList.forEach(function(m) {
                m.init.restore();
            });
            auth.needsPermission.restore();

            flows.get.restore();
            flows.post.restore();
            flow.get.restore();
            flow.post.restore();
            flow.delete.restore();
            flow.put.restore();
            nodes.getAll.restore();
            nodes.post.restore();
            nodes.getModule.restore();
            nodes.putModule.restore();
            nodes.delete.restore();
            nodes.getSet.restore();
            nodes.putSet.restore();
            nodes.getModuleCatalog.restore();
            nodes.getModuleCatalogs.restore();
            context.get.restore();
            context.delete.restore();

        });

        before(function() {
            app = adminApi.init({});
        });

        beforeEach(function() {
            permissionChecks = {};
        });

        it('GET /flows', function(done) {
            request(app).get("/flows").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('flows.read',1);
                done();
            });
        });

        it('POST /flows', function(done) {
            request(app).post("/flows").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('flows.write',1);
                done();
            });
        });

        it('GET /flow/1234', function(done) {
            request(app).get("/flow/1234").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('flows.read',1);
                lastRequest.params.should.have.property('id','1234');
                done();
            });
        });

        it('POST /flow', function(done) {
            request(app).post("/flow").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('flows.write',1);
                done();
            });
        });

        it('DELETE /flow/1234', function(done) {
            request(app).del("/flow/1234").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('flows.write',1);
                lastRequest.params.should.have.property('id','1234');
                done();
            });
        });

        it('PUT /flow/1234', function(done) {
            request(app).put("/flow/1234").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('flows.write',1);
                lastRequest.params.should.have.property('id','1234');
                done();
            });
        });

        it('GET /nodes', function(done) {
            request(app).get("/nodes").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                done();
            });
        });

        it('POST /nodes', function(done) {
            request(app).post("/nodes").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                done();
            });
        });

        it('GET /nodes/module', function(done) {
            request(app).get("/nodes/module").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                lastRequest.params.should.have.property(0,'module');
                done();
            });
        });

        it('GET /nodes/@scope/module', function(done) {
            request(app).get("/nodes/@scope/module").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                lastRequest.params.should.have.property(0,'@scope/module');
                done();
            });
        });

        it('PUT /nodes/module', function(done) {
            request(app).put("/nodes/module").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                lastRequest.params.should.have.property(0,'module');
                done();
            });
        });

        it('PUT /nodes/@scope/module', function(done) {
            request(app).put("/nodes/@scope/module").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                lastRequest.params.should.have.property(0,'@scope/module');
                done();
            });
        });

        it('DELETE /nodes/module', function(done) {
            request(app).del("/nodes/module").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                lastRequest.params.should.have.property(0,'module');
                done();
            });
        });

        it('DELETE /nodes/@scope/module', function(done) {
            request(app).del("/nodes/@scope/module").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                lastRequest.params.should.have.property(0,'@scope/module');
                done();
            });
        });

        it('GET /nodes/module/set', function(done) {
            request(app).get("/nodes/module/set").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                lastRequest.params.should.have.property(0,'module');
                lastRequest.params.should.have.property(2,'set');
                done();
            });
        });

        it('GET /nodes/@scope/module/set', function(done) {
            request(app).get("/nodes/@scope/module/set").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                lastRequest.params.should.have.property(0,'@scope/module');
                lastRequest.params.should.have.property(2,'set');
                done();
            });
        });

        it('PUT /nodes/module/set', function(done) {
            request(app).put("/nodes/module/set").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                lastRequest.params.should.have.property(0,'module');
                lastRequest.params.should.have.property(2,'set');
                done();
            });
        });

        it('PUT /nodes/@scope/module/set', function(done) {
            request(app).put("/nodes/@scope/module/set").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.write',1);
                lastRequest.params.should.have.property(0,'@scope/module');
                lastRequest.params.should.have.property(2,'set');
                done();
            });
        });

        it('GET /nodes/messages', function(done) {
            request(app).get("/nodes/messages").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                done();
            });
        });

        it('GET /nodes/module/set/messages', function(done) {
            request(app).get("/nodes/module/set/messages").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                lastRequest.params.should.have.property(0,'module/set');
                done();
            });
        });

        it('GET /nodes/@scope/module/set/messages', function(done) {
            request(app).get("/nodes/@scope/module/set/messages").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('nodes.read',1);
                lastRequest.params.should.have.property(0,'@scope/module/set');
                done();
            });
        });

        it('GET /context/global', function(done) {
            request(app).get("/context/global").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.read',1);
                lastRequest.params.should.have.property('scope','global');
                done();
            });
        });

        it('GET /context/global/key?store=memory', function(done) {
            request(app).get("/context/global/key?store=memory").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.read',1);
                lastRequest.params.should.have.property('scope','global');
                lastRequest.params.should.have.property(0,'key');
                lastRequest.query.should.have.property('store','memory');
                done();
            });
        });

        it('GET /context/flow/1234', function(done) {
            request(app).get("/context/flow/1234").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.read',1);
                lastRequest.params.should.have.property('scope','flow');
                lastRequest.params.should.have.property('id','1234');
                done();
            });
        });

        it('GET /context/flow/1234/key?store=memory', function(done) {
            request(app).get("/context/flow/1234/key?store=memory").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.read',1);
                lastRequest.params.should.have.property('scope','flow');
                lastRequest.params.should.have.property('id','1234');
                lastRequest.params.should.have.property(0,'key');
                lastRequest.query.should.have.property('store','memory');
                done();
            });
        });

        it('GET /context/node/5678', function(done) {
            request(app).get("/context/node/5678").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.read',1);
                lastRequest.params.should.have.property('scope','node');
                lastRequest.params.should.have.property('id','5678');
                done();
            });
        });

        it('GET /context/node/5678/foo?store=memory', function(done) {
            request(app).get("/context/node/5678/foo?store=memory").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.read',1);
                lastRequest.params.should.have.property('scope','node');
                lastRequest.params.should.have.property('id','5678');
                lastRequest.params.should.have.property(0,'foo');
                lastRequest.query.should.have.property('store','memory');
                done();
            });
        });

        it('DELETE /context/global/key?store=memory', function(done) {
            request(app).del("/context/global/key?store=memory").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.write',1);
                lastRequest.params.should.have.property('scope','global');
                lastRequest.params.should.have.property(0,'key');
                lastRequest.query.should.have.property('store','memory');
                done();
            });
        });

        it('DELETE /context/flow/1234/key?store=memory', function(done) {
            request(app).del("/context/flow/1234/key?store=memory").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.write',1);
                lastRequest.params.should.have.property('scope','flow');
                lastRequest.params.should.have.property('id','1234');
                lastRequest.params.should.have.property(0,'key');
                lastRequest.query.should.have.property('store','memory');
                done();
            });
        });

        it('DELETE /context/node/5678/foo?store=memory', function(done) {
            request(app).del("/context/node/5678/foo?store=memory").expect(200).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                permissionChecks.should.have.property('context.write',1);
                lastRequest.params.should.have.property('scope','node');
                lastRequest.params.should.have.property('id','5678');
                lastRequest.params.should.have.property(0,'foo');
                lastRequest.query.should.have.property('store','memory');
                done();
            });
        });
    });
});
