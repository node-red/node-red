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

var when = require('when');

var app;
var library = require("../../../red/api/library");
var auth = require("../../../red/api/auth");

describe("library api", function() {

    function initLibrary(_flows,_libraryEntries) {
        var flows = _flows;
        var libraryEntries = _libraryEntries;
        library.init(app,{
            log:{audit:function(){},_:function(){},warn:function(){}},
            storage: {
                init: function() {
                    return when.resolve();
                },
                getAllFlows: function() {
                    return when.resolve(flows);
                },
                getFlow: function(fn) {
                    if (flows[fn]) {
                        return when.resolve(flows[fn]);
                    } else if (fn.indexOf("..")!==-1) {
                        var err = new Error();
                        err.code = 'forbidden';
                        return when.reject(err);
                    } else {
                        return when.reject();
                    }
                },
                saveFlow: function(fn,data) {
                    if (fn.indexOf("..")!==-1) {
                        var err = new Error();
                        err.code = 'forbidden';
                        return when.reject(err);
                    }
                    flows[fn] = data;
                    return when.resolve();
                },
                getLibraryEntry: function(type,path) {
                    if (path.indexOf("..")!==-1) {
                        var err = new Error();
                        err.code = 'forbidden';
                        return when.reject(err);
                    }
                    if (libraryEntries[type] && libraryEntries[type][path]) {
                        return when.resolve(libraryEntries[type][path]);
                    } else {
                        return when.reject();
                    }
                },
                saveLibraryEntry: function(type,path,meta,body) {
                    if (path.indexOf("..")!==-1) {
                        var err = new Error();
                        err.code = 'forbidden';
                        return when.reject(err);
                    }
                    libraryEntries[type][path] = body;
                    return when.resolve();
                }
            },
            events: {
                on: function(){},
                removeListener: function(){}
            }
        });
    }

    describe("flows", function() {
        before(function() {
            app = express();
            app.use(bodyParser.json());
            app.get("/library/flows",library.getAll);
            app.post(new RegExp("/library/flows\/(.*)"),library.post);
            app.get(new RegExp("/library/flows\/(.*)"),library.get);
        });
        it('returns empty result', function(done) {
            initLibrary({},{flows:{}});
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
            initLibrary({},{flows:{}});
            request(app)
                .get('/library/flows/foo')
                .expect(404)
                .end(done);
        });


        it('can store and retrieve item', function(done) {
            initLibrary({},{flows:{}});
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
            initLibrary({f:["bar"]});
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
            initLibrary({});
            // without the userDir override the malicious url would be
            // http://127.0.0.1:1880/library/flows/../../package to
            // obtain package.json from the node-red root.
            request(app)
                .get('/library/flows/../../../../../package')
                .expect(403)
                .end(done);
        });
        it('returns 403 for malicious post attempt', function(done) {
            initLibrary({});
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
        before(function() {

            app = express();
            app.use(bodyParser.json());
            initLibrary({},{});
            auth.init({settings:{}});
            library.register("test");
        });

        it('returns empty result', function(done) {
            initLibrary({},{'test':{"":[]}});
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
            initLibrary({},{});
            request(app)
                .get('/library/test/foo')
                .expect(404)
                .end(done);
        });

        it('can store and retrieve item', function(done) {
            initLibrary({},{'test':{}});
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
            initLibrary({},{'test':{'a':['abc','def']}});
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
