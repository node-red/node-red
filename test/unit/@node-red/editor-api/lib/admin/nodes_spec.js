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
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');
var sinon = require('sinon');
var when = require('when');

var NR_TEST_UTILS = require("nr-test-utils");

var nodes = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/nodes");
var apiUtil = NR_TEST_UTILS.require("@node-red/editor-api/lib/util");

describe("api/admin/nodes", function() {

    var app;
    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/nodes",nodes.getAll);
        app.post("/nodes",nodes.post);
        app.get(/\/nodes\/messages/,nodes.getModuleCatalogs);
        app.get(/\/nodes\/((@[^\/]+\/)?[^\/]+\/[^\/]+)\/messages/,nodes.getModuleCatalog);
        app.get(/\/nodes\/((@[^\/]+\/)?[^\/]+)$/,nodes.getModule);
        app.put(/\/nodes\/((@[^\/]+\/)?[^\/]+)$/,nodes.putModule);
        app.get(/\/nodes\/((@[^\/]+\/)?[^\/]+)\/([^\/]+)$/,nodes.getSet);
        app.put(/\/nodes\/((@[^\/]+\/)?[^\/]+)\/([^\/]+)$/,nodes.putSet);
        app.get("/getIcons",nodes.getIcons);
        app.delete(/\/nodes\/((@[^\/]+\/)?[^\/]+)$/,nodes.delete);
        sinon.stub(apiUtil,"determineLangFromHeaders", function() {
            return "en-US";
        });
    });
    after(function() {
        apiUtil.determineLangFromHeaders.restore();
    })

    describe('get nodes', function() {
        it('returns node list', function(done) {
            nodes.init({
                nodes:{
                    getNodeList: function() {
                        return Promise.resolve([1,2,3]);
                    }
                }
            });
            request(app)
                .get('/nodes')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.be.an.Array();
                    res.body.should.have.lengthOf(3);
                    done();
                });
        });

        it('returns node configs', function(done) {
            nodes.init({
                nodes:{
                    getNodeConfigs: function() {
                        return Promise.resolve("<script></script>");
                    }
                },
                i18n: {
                    determineLangFromHeaders: function(){}
                }
            });
            request(app)
                .get('/nodes')
                .set('Accept', 'text/html')
                .expect(200)
                .expect("<script></script>")
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns node module info', function(done) {
            nodes.init({
                nodes:{
                    getModuleInfo: function(opts) {
                        return Promise.resolve({"node-red":{name:"node-red"}}[opts.module]);
                    }
                }
            });
            request(app)
                .get('/nodes/node-red')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name","node-red");
                    done();
                });
        });

        it('returns 404 for unknown module', function(done) {
            nodes.init({
                nodes:{
                    getModuleInfo: function(opts) {
                        var errInstance = new Error("Not Found");
                        errInstance.code = "not_found";
                        errInstance.status = 404;
                        var p = Promise.reject(errInstance);
                        p.catch(()=>{});
                        return p;
                    }
                }
            });
            request(app)
                .get('/nodes/node-blue')
                .expect(404)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns individual node info', function(done) {
            nodes.init({
                nodes:{
                    getNodeInfo: function(opts) {
                        return Promise.resolve({"node-red/123":{id:"node-red/123"}}[opts.id]);
                    }
                }
            });
            request(app)
                .get('/nodes/node-red/123')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","node-red/123");
                    done();
                });
        });

        it('returns individual node configs', function(done) {
            nodes.init({
                nodes:{
                    getNodeConfig: function(opts) {
                        return Promise.resolve({"node-red/123":"<script></script>"}[opts.id]);
                    }
                },
                i18n: {
                    determineLangFromHeaders: function(){}
                }
            });
            request(app)
                .get('/nodes/node-red/123')
                .set('Accept', 'text/html')
                .expect(200)
                .expect("<script></script>")
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
        it('returns 404 for unknown node', function(done) {
            nodes.init({
                nodes:{
                    getNodeInfo: function(opts) {
                        var errInstance = new Error("Not Found");
                        errInstance.code = "not_found";
                        errInstance.status = 404;
                        var p = Promise.reject(errInstance);
                        p.catch(()=>{});
                        return p;
                    }
                }
            });
            request(app)
                .get('/nodes/node-red/456')
                .set('Accept', 'application/json')
                .expect(404)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
    });

    describe('install', function() {
        it('installs the module and returns module info', function(done) {
            var opts;
            nodes.init({
                nodes:{
                    addModule: function(_opts) {
                        opts = _opts;
                        return Promise.resolve({
                            name:"foo",
                            nodes:[{id:"123"}]
                        });
                    }
                }
            });
            request(app)
            .post('/nodes')
            .send({module: 'foo',version:"1.2.3"})
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    throw err;
                }
                res.body.should.have.property("name","foo");
                res.body.should.have.property("nodes");
                res.body.nodes[0].should.have.property("id","123");
                opts.should.have.property("module","foo");
                opts.should.have.property("version","1.2.3");
                done();
            });
        });
        it('returns error', function(done) {
            nodes.init({
                nodes:{
                    addModule: function(opts) {
                        var errInstance = new Error("Message");
                        errInstance.code = "random_error";
                        errInstance.status = 400;
                        var p = Promise.reject(errInstance);
                        p.catch(()=>{});
                        return p;
                    }
                }
            });
            request(app)
                .post('/nodes')
                .send({module: 'foo',version:"1.2.3"})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.a.property('code','random_error');
                    done();
                });
        });
    });
    describe('delete', function() {
        it('uninstalls the module', function(done) {
            var opts;
            nodes.init({
                nodes:{
                    removeModule: function(_opts) {
                        opts = _opts;
                        return Promise.resolve();
                    }
                }
            });
            request(app)
            .del('/nodes/123')
            .expect(204)
            .end(function(err,res) {
                if (err) {
                    throw err;
                }
                opts.should.have.property("module","123");
                done();
            });
        });
        it('returns error', function(done) {
            nodes.init({
                nodes:{
                    removeModule: function(opts) {
                        var errInstance = new Error("Message");
                        errInstance.code = "random_error";
                        errInstance.status = 400;
                        var p = Promise.reject(errInstance);
                        p.catch(()=>{});
                        return p;
                    }
                }
            });
            request(app)
                .del('/nodes/123')
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.a.property('code','random_error');
                    done();
                });
        });
    });

    describe('enable/disable node set', function() {
        it('returns 400 for invalid request payload', function(done) {
            nodes.init({
                nodes:{
                    setNodeSetState: function(opts) {return Promise.resolve()}
                }
            });
            request(app)
                .put('/nodes/node-red/foo')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("code","invalid_request");
                    res.body.should.have.property("message","Invalid request");
                    done();
                });
        });

        it('sets node state and returns node info', function(done) {
            var opts;
            nodes.init({
                nodes:{
                    setNodeSetState: function(_opts) {
                        opts = _opts;
                        return Promise.resolve({id:"123",enabled: true });
                    }
                }
            });

            request(app)
                .put('/nodes/node-red/foo')
                .send({enabled:true})
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","123");
                    res.body.should.have.property("enabled",true);
                    opts.should.have.property("enabled",true);
                    opts.should.have.property("id","node-red/foo");

                    done();
                });
        });
    });
    describe('enable/disable module' ,function() {
        it('returns 400 for invalid request payload', function(done) {
            nodes.init({
                nodes:{
                    setModuleState: function(opts) {return Promise.resolve()}
                }
            });
            request(app)
                .put('/nodes/node-red')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("code","invalid_request");
                    res.body.should.have.property("message","Invalid request");
                    done();
                });
        });
        it('sets module state and returns module info', function(done) {
            var opts;
            nodes.init({
                nodes:{
                    setModuleState: function(_opts) {
                        opts = _opts;
                        return Promise.resolve({name:"node-red"});
                    }
                }
            });

            request(app)
                .put('/nodes/node-red')
                .send({enabled:true})
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name","node-red");
                    opts.should.have.property("enabled",true);
                    opts.should.have.property("module","node-red");

                    done();
                });
        });
    });

    describe('get icons', function() {
        it('returns icon list', function(done) {
            nodes.init({
                nodes:{
                    getIconList: function() {
                        return Promise.resolve({module:[1,2,3]});
                    }
                }
            });
            request(app)
                .get('/getIcons')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("module");
                    res.body.module.should.be.an.Array();
                    res.body.module.should.have.lengthOf(3);
                    done();
                });
        });
    });

    describe('get module messages', function() {
        it('returns message catalog', function(done) {
            nodes.init({
                nodes:{
                    getModuleCatalog: function(opts) {
                        return Promise.resolve({a:123});
                    }
                }
            });
            request(app)
                .get('/nodes/module/set/messages')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.eql({a:123});
                    done();
                });
        });
        it('returns all node catalogs', function(done) {
            nodes.init({
                nodes:{
                    getModuleCatalogs: function(opts) {
                        return Promise.resolve({a:1});
                    }
                }
            });
            request(app)
                .get('/nodes/messages')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.eql({a:1});
                    done();
                });
        });
    })
});
