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

var NR_TEST_UTILS = require("nr-test-utils");

var context = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/context");

describe("api/admin/context", function () {
    var app = undefined;

    before(function () {
        app = express();
        app.use(bodyParser.json());
        app.get("/context/:scope(global)", context.get);
        app.get("/context/:scope(global)/*", context.get);
        app.get("/context/:scope(node|flow)/:id", context.get);
        app.get("/context/:scope(node|flow)/:id/*", context.get);

        app.delete("/context/:scope(global)/*", context.delete);
        app.delete("/context/:scope(node|flow)/:id/*", context.delete);
    });

    describe("get", function () {
        var gContext = {
            default: { abc: { msg: '111', format: 'number' } },
            file: { abc: { msg: '222', format: 'number' } }
        };
        var fContext = {
            default: { bool: { msg: 'true', format: 'boolean' } },
            file: { string: { msg: 'aaaa', format: 'string[7]' } }
        };
        var nContext = { msg: "1", format: "number" };
        var stub = sinon.stub();

        before(function () {
            context.init({
                context: {
                    getValue: stub
                }
            });
        });

        afterEach(function () {
            stub.reset();
        });

        it('should call context.getValue to get global contexts', function (done) {
            stub.returns(Promise.resolve(gContext));
            request(app)
                .get('/context/global')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'global');
                    stub.args[0][0].should.have.property('id', undefined);
                    stub.args[0][0].should.have.property('key', undefined);
                    stub.args[0][0].should.have.property('store', undefined);
                    var body = res.body;
                    body.should.eql(gContext);
                    done();
                });
        });

        it('should call context.getValue to get flow contexts', function (done) {
            stub.returns(Promise.resolve(fContext));
            request(app)
                .get('/context/flow/1234/')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'flow');
                    stub.args[0][0].should.have.property('id', '1234');
                    stub.args[0][0].should.have.property('key', undefined);
                    stub.args[0][0].should.have.property('store', undefined);
                    var body = res.body;
                    body.should.eql(fContext);
                    done();
                });
        });

        it('should call context.getValue to get a node context', function (done) {
            stub.returns(Promise.resolve(nContext));
            request(app)
                .get('/context/node/5678/foo?store=file')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'node');
                    stub.args[0][0].should.have.property('id', '5678');
                    stub.args[0][0].should.have.property('key', 'foo');
                    stub.args[0][0].should.have.property('store', 'file');
                    var body = res.body;
                    body.should.eql(nContext);
                    done();
                });
        });

        it('should call context.getValue to get a node context value - url unsafe keyname', function (done) {
            stub.returns(Promise.resolve(nContext));
            request(app)
                .get('/context/node/5678/foo%23123?store=file')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'node');
                    stub.args[0][0].should.have.property('id', '5678');
                    stub.args[0][0].should.have.property('key', 'foo#123');
                    stub.args[0][0].should.have.property('store', 'file');
                    var body = res.body;
                    body.should.eql(nContext);
                    done();
                });
        });
        it('should handle error which context.getValue causes', function (done) {
            var stubbedResult = Promise.reject('error');
            stubbedResult.catch(function() {});
            stub.returns(stubbedResult);
            request(app)
                .get('/context/global')
                .set('Accept', 'application/json')
                .expect(400)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('code', 'unexpected_error');
                    res.body.should.has.a.property('message', 'error');
                    done();
                });
        });
    });

    describe("delete", function () {
        var stub = sinon.stub();

        before(function () {
            context.init({
                context: {
                    delete: stub
                }
            });
        });

        afterEach(function () {
            stub.reset();
        });

        it('should call context.delete to delete a global context', function (done) {
            stub.returns(Promise.resolve());
            request(app)
                .delete('/context/global/abc?store=default')
                .expect(204)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'global');
                    stub.args[0][0].should.have.property('id', undefined);
                    stub.args[0][0].should.have.property('key', 'abc');
                    stub.args[0][0].should.have.property('store', 'default');
                    done();
                });
        });

        it('should call context.delete to delete a flow context', function (done) {
            stub.returns(Promise.resolve());
            request(app)
                .delete('/context/flow/1234/abc?store=file')
                .expect(204)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'flow');
                    stub.args[0][0].should.have.property('id', '1234');
                    stub.args[0][0].should.have.property('key', 'abc');
                    stub.args[0][0].should.have.property('store', 'file');
                    done();
                });
        });

        it('should call context.delete to delete a node context', function (done) {
            stub.returns(Promise.resolve());
            request(app)
                .delete('/context/node/5678/foo?store=file')
                .expect(204)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'node');
                    stub.args[0][0].should.have.property('id', '5678');
                    stub.args[0][0].should.have.property('key', 'foo');
                    stub.args[0][0].should.have.property('store', 'file');
                    done();
                });
        });

        it('should call context.delete to delete a node context - url unsafe keyname', function (done) {
            stub.returns(Promise.resolve());
            request(app)
                .delete('/context/node/5678/foo%23123?store=file')
                .expect(204)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    stub.args[0][0].should.have.property('user', undefined);
                    stub.args[0][0].should.have.property('scope', 'node');
                    stub.args[0][0].should.have.property('id', '5678');
                    stub.args[0][0].should.have.property('key', 'foo#123');
                    stub.args[0][0].should.have.property('store', 'file');
                    done();
                });
        });

        it('should handle error which context.delete causes', function (done) {
            var stubbedResult = Promise.reject('error');
            stubbedResult.catch(function() {});
            stub.returns(stubbedResult);
            request(app)
                .delete('/context/global/abc?store=default')
                .expect(400)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.has.a.property('code', 'unexpected_error');
                    res.body.should.has.a.property('message', 'error');
                    done();
                });
        });
    });
});
