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

var flow = require("../../../red/api/flow");

describe("flow api", function() {

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
            flow.init({
                settings:{},
                nodes: {
                    getFlow: function(id) {
                        if (id === '123') {
                            return {id:'123'}
                        } else {
                            return null;
                        }
                    }
                },
                log:{ audit: sinon.stub() }
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
        before(function() {
            flow.init({
                settings:{},
                nodes: {
                    addFlow: function(f) {
                        if (f.id === "123") {
                            return when.resolve('123')
                        } else {
                            return when.reject(new Error("test error"));
                        }
                    }
                },
                log:{ audit: sinon.stub() }
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
                    res.body.should.has.a.property('error','unexpected_error');
                    res.body.should.has.a.property('message','Error: test error');

                    done();
                });
        })
    })

    describe("update", function() {
        var nodes;
        before(function() {
            nodes = {
                updateFlow: function(id,f) {
                    var err;
                    if (id === "123") {
                        return when.resolve()
                    } else if (id === "unknown") {
                        err = new Error();
                        err.code = 404;
                        throw err;
                    } else if (id === "unexpected") {
                        err = new Error();
                        err.code = 500;
                        throw err;
                    } else {
                        return when.reject(new Error("test error"));
                    }
                }
            };
            flow.init({
                settings:{},
                nodes: nodes,
                log:{ audit: sinon.stub() }
            });
        })

        it('updates an existing flow', function(done) {
            sinon.spy(nodes,"updateFlow");
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
                    nodes.updateFlow.calledOnce.should.be.true();
                    nodes.updateFlow.lastCall.args[0].should.eql('123');
                    nodes.updateFlow.lastCall.args[1].should.eql({id:'123'});
                    nodes.updateFlow.restore();
                    done();
                });
        })

        it('404s on an unknown flow', function(done) {
            request(app)
                .put('/flow/unknown')
                .set('Accept', 'application/json')
                .send({id:'123'})
                .expect(404)
                .end(done);
        })

        it('400 on async update error', function(done) {
            request(app)
                .put('/flow/async_error')
                .set('Accept', 'application/json')
                .send({id:'123'})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('error','unexpected_error');
                    res.body.should.has.a.property('message','Error: test error');
                    done();
                });
        })

        it('400 on sync update error', function(done) {
            request(app)
                .put('/flow/unexpected')
                .set('Accept', 'application/json')
                .send({id:'123'})
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('error',500);
                    res.body.should.has.a.property('message','Error');
                    done();
                });
        })
    })

    describe("delete", function() {
        var nodes;
        before(function() {
            nodes = {
                removeFlow: function(id) {
                    var err;
                    if (id === "123") {
                        return when.resolve()
                    } else if (id === "unknown") {
                        err = new Error();
                        err.code = 404;
                        throw err;
                    } else if (id === "unexpected") {
                        err = new Error();
                        err.code = 500;
                        throw err;
                    }
                }
            };
            flow.init({
                settings:{},
                nodes: nodes,
                log:{ audit: sinon.stub() }
            });
        })

        it('updates an existing flow', function(done) {
            sinon.spy(nodes,"removeFlow");
            request(app)
                .delete('/flow/123')
                .expect(204)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    nodes.removeFlow.calledOnce.should.be.true();
                    nodes.removeFlow.lastCall.args[0].should.eql('123');
                    nodes.removeFlow.restore();
                    done();
                });
        })

        it('404s on an unknown flow', function(done) {
            request(app)
                .delete('/flow/unknown')
                .expect(404)
                .end(done);
        })

        it('400 on remove error', function(done) {
            request(app)
                .delete('/flow/unexpected')
                .expect(400)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('error',500);
                    res.body.should.has.a.property('message','Error');
                    done();
                });
        })
    })

});
