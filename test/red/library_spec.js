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
var sinon = require('sinon');
var request = require('supertest');
var http = require('http');
var express = require('express');

var fs = require('fs-extra');
var path = require('path');
var when = require('when');

var app = express();
var RED = require("../../red/red.js");
var server = require("../../red/server.js");
var nodes = require("../../red/nodes");

describe("library", function() {
    var userDir = path.join(__dirname,".testUserHome");
    before(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,function() {
                sinon.stub(nodes, 'load', function() {
                    return when.promise(function(resolve,reject){
                        resolve([]);
                    });
                });
                RED.init(http.createServer(function(req,res){app(req,res)}),
                         {userDir: userDir});
                server.start().then(function () { done(); });
            });
        });
    });

    after(function(done) {
        fs.remove(userDir,done);
        server.stop();
        nodes.load.restore();
    });

    afterEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });

    describe("flows", function() {
        it('returns empty result', function(done) {
            request(RED.httpAdmin)
                .get('/library/flows')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.not.have.property('f');
                    done();
                });
        });

        it('returns 404 for non-existent entry', function(done) {
            request(RED.httpAdmin)
                .get('/library/flows/foo')
                .expect(404)
                .end(done);
        });

        it('can store and retrieve item', function(done) {
            var flow = '[]';
            request(RED.httpAdmin)
                .post('/library/flows/foo')
                .set('Content-Type', 'text/plain')
                .send(flow)
                .expect(204).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    request(RED.httpAdmin)
                        .get('/library/flows/foo')
                        .expect(200)
                        .end(function(err,res) {
                            if (err) {
                                throw err;
                            }
                            res.text.should.equal(flow);
                            done();
                        });
                });
        });

        it('lists a stored item', function(done) {
            request(RED.httpAdmin)
                .post('/library/flows/bar')
                .expect(204)
                .end(function () {
                    request(RED.httpAdmin)
                        .get('/library/flows')
                        .expect(200)
                        .end(function(err,res) {
                            if (err) {
                                throw err;
                            }
                            res.body.should.have.property('f');
                            should.deepEqual(res.body.f,['bar']);
                            done();
                        });
                });
        });

        it('returns 403 for malicious access attempt', function(done) {
            // without the userDir override the malicious url would be
            // http://127.0.0.1:1880/library/flows/../../package to
            // obtain package.json from the node-red root.
            request(RED.httpAdmin)
                .get('/library/flows/../../../../../package')
                .expect(403)
                .end(done);
        });

        it('returns 403 for malicious access attempt', function(done) {
            // without the userDir override the malicious url would be
            // http://127.0.0.1:1880/library/flows/../../package to
            // obtain package.json from the node-red root.
            request(RED.httpAdmin)
                .post('/library/flows/../../../../../package')
                .expect(403)
                .end(done);
        });

    });

    describe("type", function() {
        before(function() {
            RED.library.register('test');
        });

        it('returns empty result', function(done) {
            request(RED.httpAdmin)
                .get('/library/test')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.not.have.property('f');
                    done();
                });
        });

        it('returns 404 for non-existent entry', function(done) {
            request(RED.httpAdmin)
                .get('/library/test/foo')
                .expect(404)
                .end(done);
        });

        it('can store and retrieve item', function(done) {
            var flow = '[]';
            request(RED.httpAdmin)
                .post('/library/test/foo')
                .set('Content-Type', 'text/plain')
                .send(flow)
                .expect(204).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    request(RED.httpAdmin)
                        .get('/library/test/foo')
                        .expect(200)
                        .end(function(err,res) {
                            if (err) {
                                throw err;
                            }
                            res.text.should.equal(flow);
                            done();
                        });
                });
        });

        it('lists a stored item', function(done) {
            request(RED.httpAdmin)
                .post('/library/test/bar')
                .expect(204)
                .end(function () {
                    request(RED.httpAdmin)
                        .get('/library/test')
                        .expect(200)
                        .end(function(err,res) {
                            if (err) {
                                throw err;
                            }
                            should.deepEqual(res.body,[{ fn: 'bar'}]);
                            done();
                        });
                });
        });


        it('returns 403 for malicious access attempt', function(done) {
            request(RED.httpAdmin)
                .get('/library/test/../../../../../../../../../../etc/passwd')
                .expect(403)
                .end(done);
        });

        it('returns 403 for malicious access attempt', function(done) {
            request(RED.httpAdmin)
                .get('/library/test/..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\etc\\passwd')
                .expect(403)
                .end(done);
        });

        it('returns 403 for malicious access attempt', function(done) {
            request(RED.httpAdmin)
                .post('/library/test/../../../../../../../../../../etc/passwd')
                .set('Content-Type', 'text/plain')
                .send('root:x:0:0:root:/root:/usr/bin/tclsh')
                .expect(403)
                .end(done);
        });

    });
});
