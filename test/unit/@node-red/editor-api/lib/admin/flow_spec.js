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

var flow = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/flow");

describe("api/admin/flow", function() {

    var app;

    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/flow/:id",flow.get);
        app.post("/flow",flow.post);
        app.put("/flow/:id",flow.put);
        app.delete("/flow/:id",flow.delete);
    });

    describe("get", function() {
        before(function() {
            var opts;
            flow.init({
                flows: {
                    getFlow: function(_opts) {
                        opts = _opts;
                        if (opts.id === '123') {
                            return Promise.resolve({id:'123'});
                        } else {
                            var err = new Error("message");
                            err.code = "not_found";
                            err.status = 404;
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        }
                    }
                }
            });
        })
        it('gets a known flow', function(done) {
            request(app)
                .get('/flow/123')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('id','123');
                    done();
                });
        })
        it('404s an unknown flow', function(done) {
            request(app)
                .get('/flow/456')
                .set('Accept', 'application/json')
                .expect(404)
                .end(done);
        })
    });

    describe("add", function() {
        var opts;
        before(function() {
            flow.init({
                flows: {
                    addFlow: function(_opts) {
                        opts = _opts;
                        if (opts.flow.id === "123") {
                            return Promise.resolve('123')
                        } else {
                            var err = new Error("random error");
                            err.code = "random_error";
                            err.status = 400;
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        }
                    }
                }
            });
        })
        it('adds a new flow', function(done) {
            request(app)
                .post('/flow')
                .set('Accept', 'application/json')
                .send({id:'123'})
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('id','123');
                    done();
                });
        })
        it('400 an invalid flow', function(done) {
            request(app)
                .post('/flow')
                .set('Accept', 'application/json')
                .send({id:'error'})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('code','random_error');
                    res.body.should.has.a.property('message','random error');

                    done();
                });
        })
    })

    describe("update", function() {

        var opts;
        before(function() {
            flow.init({
                flows: {
                    updateFlow: function(_opts) {
                        opts = _opts;
                        if (opts.id === "123") {
                            return Promise.resolve('123')
                        } else {
                            var err = new Error("random error");
                            err.code = "random_error";
                            err.status = 400;
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        }
                    }
                }
            });
        })

        it('updates an existing flow', function(done) {
            request(app)
                .put('/flow/123')
                .set('Accept', 'application/json')
                .send({id:'123'})
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('id','123');
                    opts.should.have.property('id','123');
                    opts.should.have.property('flow',{id:'123'})
                    done();
                });
        })

        it('400 an invalid flow', function(done) {
            request(app)
                .put('/flow/456')
                .set('Accept', 'application/json')
                .send({id:'456'})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('code','random_error');
                    res.body.should.has.a.property('message','random error');

                    done();
                });
        })
    })

    describe("delete", function() {

        var opts;
        before(function() {
            flow.init({
                flows: {
                    deleteFlow: function(_opts) {
                        opts = _opts;
                        if (opts.id === "123") {
                            return Promise.resolve()
                        } else {
                            var err = new Error("random error");
                            err.code = "random_error";
                            err.status = 400;
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        }
                    }
                }
            });
        })

        it('deletes an existing flow', function(done) {
            request(app)
                .del('/flow/123')
                .set('Accept', 'application/json')
                .expect(204)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    opts.should.have.property('id','123');
                    done();
                });
        })

        it('400 an invalid flow', function(done) {
            request(app)
                .del('/flow/456')
                .set('Accept', 'application/json')
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('code','random_error');
                    res.body.should.has.a.property('message','random error');

                    done();
                });
        })
    })

});
