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

var context = require("../../../../red/api/admin/context");
var Context = require("../../../../red/runtime/nodes/context");
var Util = require("../../../../red/runtime/util");

describe("api/admin/context", function() {
    var app = undefined;

    before(function (done) {
        var node_context = undefined;
        app = express();
        app.use(bodyParser.json());
        app.get("/context/:scope(global)", context.get);
        app.get("/context/:scope(global)/*", context.get);
        app.get("/context/:scope(node|flow)/:id", context.get);
        app.get("/context/:scope(node|flow)/:id/*", context.get);

        context.init({
            settings: {
            },
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes: {
                listContextStores: Context.listStores,
                getContext: Context.get,
                getNode: function(id) {
                    if (id === 'NID') {
                        return {
                            id: 'NID',
                            context: function () {
                                return node_context;
                            }
                        };
                    }
                    return null;
                }
            },
            util: Util
        });
        
        Context.init({
            contextStorage: {
                memory0: {
                    module: "memory"
                },
                memory1: {
                    module: "memory"
                }
            }
        });
        Context.load().then(function () {
            var ctx = Context.get("NID", "FID");
            node_context = ctx;
            ctx.set("foo", "n_v00", "memory0");
            ctx.set("bar", "n_v01", "memory0");
            ctx.set("baz", "n_v10", "memory1");
            ctx.set("bar", "n_v11", "memory1");
            ctx.flow.set("foo", "f_v00", "memory0");
            ctx.flow.set("bar", "f_v01", "memory0");
            ctx.flow.set("baz", "f_v10", "memory1");
            ctx.flow.set("bar", "f_v11", "memory1");
            ctx.global.set("foo", "g_v00", "memory0");
            ctx.global.set("bar", "g_v01", "memory0");
            ctx.global.set("baz", "g_v10", "memory1");
            ctx.global.set("bar", "g_v11", "memory1");
            done();
        });

    });

    after(function () {
        Context.clean({allNodes:{}});
        Context.close();
    });

    function check_mem(body, mem, name, val) {
        var mem0 = body[mem];
        mem0.should.have.property(name);
        mem0[name].should.deepEqual(val);
    }

    function check_scope(scope, prefix, id) {
        describe('# '+scope, function () {
            var xid = id ? ("/"+id) : "";
            
            it('should return '+scope+' contexts', function (done) {
                request(app)
                    .get('/context/'+scope+xid)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }
                        var body = res.body;
                        body.should.have.key('memory0', 'memory1');
                        check_mem(body, 'memory0',
                                  'foo', {msg:prefix+'_v00', format:'string[5]'});
                        check_mem(body, 'memory0',
                                  'bar', {msg:prefix+'_v01', format:'string[5]'});
                        check_mem(body, 'memory1',
                                  'baz', {msg:prefix+'_v10', format:'string[5]'});
                        check_mem(body, 'memory1',
                                  'bar', {msg:prefix+'_v11', format:'string[5]'});
                        done();
                    });
            });

            it('should return a value from default '+scope+' context', function (done) {
                request(app)
                    .get('/context/'+scope+xid+'/foo')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }
                        var body = res.body;
                        body.should.deepEqual({msg: prefix+'_v00', format: 'string[5]'});
                        done();
                    });
            });

            it('should return a value from specified '+scope+' context', function (done) {
                request(app)
                    .get('/context/'+scope+xid+'/bar?store=memory1')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }
                        var body = res.body;
                        body.should.deepEqual({msg: prefix+'_v11', format: 'string[5]', store: 'memory1'});
                        done();
                    });
            });

            it('should return specified '+scope+' store', function (done) {
                request(app)
                    .get('/context/'+scope+xid+'?store=memory1')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }
                        var body = res.body;
                        body.should.deepEqual({
                            memory1: {
                                baz: { msg: prefix+'_v10', format: 'string[5]' },
                                bar: { msg: prefix+'_v11', format: 'string[5]' }
                            }
                        });
                        done();
                    });
            });

            it('should return undefined for unknown key of default '+scope+' store', function (done) {
                request(app)
                    .get('/context/'+scope+xid+'/unknown')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }
                        var body = res.body;
                        body.should.deepEqual({msg:'(undefined)', format:'undefined'});
                        done();

                    });
            });

            it('should cause error for unknown '+scope+' store', function (done) {
                request(app)
                    .get('/context/'+scope+xid+'?store=unknown')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done();
                        }
                        done("unexpected");
                    });
            });
        });
    }

    check_scope("global", "g", undefined);
    check_scope("node", "n", "NID");
    check_scope("flow", "f", "FID");

    describe("# errors", function () {
        it('should cause error for unknown scope', function (done) {
            request(app)
                .get('/context/scope')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done();
                    }
                    done("unexpected");
                });
        });

    });

});
