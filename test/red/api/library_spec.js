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

var when = require('when');

var app = express();
var RED = require("../../../red/red.js");
var storage = require("../../../red/storage");
var library = require("../../../red/api/library");
var auth = require("../../../red/api/auth");

describe("library api", function() {
        
    function initStorage(_flows,_libraryEntries) {
        var flows = _flows;
        var libraryEntries = _libraryEntries;
        storage.init({
            storageModule: {
                init: function() {
                    return when.resolve();
                },
                getAllFlows: function() {
                    return when.resolve(flows);
                },
                getFlow: function(fn) {
                    if (flows[fn]) {
                        return when.resolve(flows[fn]);
                    } else {
                        return when.reject();
                    }
                },
                saveFlow: function(fn,data) {
                    flows[fn] = data;
                    return when.resolve();
                },
                getLibraryEntry: function(type,path) {
                    if (libraryEntries[type] && libraryEntries[type][path]) {
                        return when.resolve(libraryEntries[type][path]);
                    } else {
                        return when.reject();
                    }
                },
                saveLibraryEntry: function(type,path,meta,body) {
                    libraryEntries[type][path] = body;
                    return when.resolve();
                }
            }
        });
    }

    describe("flows", function() {
        var app;
    
        before(function() {
            app = express();
            app.use(express.json());
            app.get("/library/flows",library.getAll);
            app.post(new RegExp("/library/flows\/(.*)"),library.post);
            app.get(new RegExp("/library/flows\/(.*)"),library.get);                
        });
        it('returns empty result', function(done) {
            initStorage({},{flows:{}});
            request(app)
                .get('/library/flows')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.not.have.property('f');
                    res.body.should.not.have.property('d');
                    done();
                });
        });

        it('returns 404 for non-existent entry', function(done) {
            initStorage({},{flows:{}});
            request(app)
                .get('/library/flows/foo')
                .expect(404)
                .end(done);
        });
        
        
        it('can store and retrieve item', function(done) {
            initStorage({},{flows:{}});
            var flow = '[]';
            request(app)
                .post('/library/flows/foo')
                .set('Content-Type', 'application/json')
                .send(flow)
                .expect(204).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    request(app)
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
            initStorage({f:["bar"]});
            request(app)
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
        
        it('returns 403 for malicious get attempt', function(done) {
            initStorage({});
            // without the userDir override the malicious url would be
            // http://127.0.0.1:1880/library/flows/../../package to
            // obtain package.json from the node-red root.
            request(app)
                .get('/library/flows/../../../../../package')
                .expect(403)
                .end(done);
        });
        it('returns 403 for malicious post attempt', function(done) {
            initStorage({});
            // without the userDir override the malicious url would be
            // http://127.0.0.1:1880/library/flows/../../package to
            // obtain package.json from the node-red root.
            request(app)
                .post('/library/flows/../../../../../package')
                .expect(403)
                .end(done);
        });
    });

    describe("type", function() {
        var app;
        
        before(function() {
            app = express();
            app.use(express.json());
            library.init(app);
            auth.init({});
            RED.library.register("test");
        });

        it('returns empty result', function(done) {
            initStorage({},{'test':{"":[]}});
            request(app)
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
            initStorage({},{});
            request(app)
                .get('/library/test/foo')
                .expect(404)
                .end(done);
        });
    
        it('can store and retrieve item', function(done) {
            initStorage({},{'test':{}});
            var flow = {text:"test content"};
            request(app)
                .post('/library/test/foo')
                .set('Content-Type', 'application/json')
                .send(flow)
                .expect(204).end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    request(app)
                        .get('/library/test/foo')
                        .expect(200)
                        .end(function(err,res) {
                            if (err) {
                                throw err;
                            }
                            res.text.should.equal(flow.text);
                            done();
                        });
                });
        });
        
        it('lists a stored item', function(done) {
            initStorage({},{'test':{'a':['abc','def']}});
                request(app)
                    .get('/library/test/a')
                    .expect(200)
                    .end(function(err,res) {
                        if (err) {
                            throw err;
                        }
                        // This response isn't strictly accurate - but it
                        // verifies the api returns what storage gave it
                        should.deepEqual(res.body,['abc','def']);
                        done();
                    });
        });
        
    
        it('returns 403 for malicious access attempt', function(done) {
            request(app)
                .get('/library/test/../../../../../../../../../../etc/passwd')
                .expect(403)
                .end(done);
        });
    
        it('returns 403 for malicious access attempt', function(done) {
            request(app)
                .get('/library/test/..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\etc\\passwd')
                .expect(403)
                .end(done);
        });
    
        it('returns 403 for malicious access attempt', function(done) {
            request(app)
                .post('/library/test/../../../../../../../../../../etc/passwd')
                .set('Content-Type', 'text/plain')
                .send('root:x:0:0:root:/root:/usr/bin/tclsh')
                .expect(403)
                .end(done);
        });
    
    });
});
