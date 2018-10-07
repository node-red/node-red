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

var NR_TEST_UTILS = require("nr-test-utils");
var library = NR_TEST_UTILS.require("@node-red/runtime/lib/api/library")

var mockLog = {
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
}

describe("runtime-api/library", function() {
    describe("getEntry", function() {
        before(function() {
            library.init({
                log: mockLog,
                library: {
                    getEntry: function(type,path) {
                        if (type === "known") {
                            return Promise.resolve("known");
                        } else if (type === "forbidden") {
                            var err = new Error("forbidden");
                            err.code = "forbidden";
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        } else if (type === "not_found") {
                            var err = new Error("forbidden");
                            err.code = "not_found";
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        } else if (type === "error") {
                            var err = new Error("error");
                            err.code = "unknown_error";
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        } else if (type === "blank") {
                            return Promise.reject();
                        }
                    }
                }
            })
        })
        it("returns a known entry", function(done) {
            library.getEntry({type: "known", path: "/abc"}).then(function(result) {
                result.should.eql("known")
                done();
            }).catch(done)
        })
        it("rejects a forbidden entry", function(done) {
            library.getEntry({type: "forbidden", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","forbidden");
                err.should.have.property("status",403);
                done();
            }).catch(done)
        })
        it("rejects an unknown entry", function(done) {
            library.getEntry({type: "not_found", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","not_found");
                err.should.have.property("status",404);
                done();
            }).catch(done)
        })
        it("rejects a blank (unknown) entry", function(done) {
            library.getEntry({type: "blank", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","not_found");
                err.should.have.property("status",404);
                done();
            }).catch(done)
        })
        it("rejects unexpected error", function(done) {
            library.getEntry({type: "error", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("status",400);
                done();
            }).catch(done)
        })
    })
    describe("saveEntry", function() {
        var opts;
        before(function() {
            library.init({
                log: mockLog,
                library: {
                    saveEntry: function(type,path,meta,body) {
                        opts = {type,path,meta,body};
                        if (type === "known") {
                            return Promise.resolve();
                        } else if (type === "forbidden") {
                            var err = new Error("forbidden");
                            err.code = "forbidden";
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        } else if (type === "not_found") {
                            var err = new Error("forbidden");
                            err.code = "not_found";
                            var p = Promise.reject(err);
                            p.catch(()=>{});
                            return p;
                        }
                    }
                }
            })
        })

        it("saves an entry", function(done) {
            library.saveEntry({type: "known", path: "/abc", meta: {a:1}, body:"123"}).then(function() {
                opts.should.have.property("type","known");
                opts.should.have.property("path","/abc");
                opts.should.have.property("meta",{a:1});
                opts.should.have.property("body","123");
                done();
            }).catch(done)
        })
        it("rejects a forbidden entry", function(done) {
            library.saveEntry({type: "forbidden", path: "/abc", meta: {a:1}, body:"123"}).then(function() {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","forbidden");
                err.should.have.property("status",403);
                done();
            }).catch(done)
        })
        it("rejects an unknown entry", function(done) {
            library.saveEntry({type: "not_found", path: "/abc", meta: {a:1}, body:"123"}).then(function() {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("status",400);
                done();
            }).catch(done)
        })
    })
    describe("getEntries", function() {
        var opts;
        before(function() {
            library.init({
                log: mockLog,
                storage: {
                    getAllFlows: function() {
                        return Promise.resolve({a:1});
                    }
                },
                nodes: {
                    getNodeExampleFlows: function() {
                        return {b:2};
                    }
                }
            });
        });
        it("returns all flows", function(done) {
            library.getEntries({type:"flows"}).then(function(result) {
                result.should.eql({a:1,d:{_examples_:{b:2}}});
                done();
            }).catch(done)
        });
        it("fails for non-flows (currently)", function(done) {
            library.getEntries({type:"functions"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                done();
            }).catch(done)
        })
    })


});


/*

var should = require("should");
var sinon = require("sinon");
var fs = require("fs");
var fspath = require('path');
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');

var when = require('when');

var app;
var library = require("../../../../red/api/editor/library");
var auth = require("../../../../red/api/auth");

describe("api/editor/library", function() {

    function initLibrary(_flows,_libraryEntries,_examples,_exampleFlowPathFunction) {
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
            },
            nodes: {
                getNodeExampleFlows: function() {
                    return _examples;
                },
                getNodeExampleFlowPath: _exampleFlowPathFunction
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
            app.response.sendFile = function (path) {
                app.response.json.call(this, {sendFile: path});
            };
            sinon.stub(fs,"statSync",function() { return true; });
        });
        after(function() {
            fs.statSync.restore();
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
        it('includes examples flows if set', function(done) {
            var examples = {"d":{"node-module":{"f":["example-one"]}}};
            initLibrary({},{},examples);
            request(app)
                .get('/library/flows')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property('d');
                    res.body.d.should.have.property('_examples_');
                    should.deepEqual(res.body.d._examples_,examples);
                    done();
                });
        });

        it('can retrieve an example flow', function(done) {
            var examples = {"d":{"node-module":{"f":["example-one"]}}};
            initLibrary({},{},examples,function(module,path) {
                return module + ':' + path
            });
            request(app)
                .get('/library/flows/_examples_/node-module/example-one')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property('sendFile',
                        fspath.resolve('node-module') + ':example-one');
                    done();
                });
        });

        it('can retrieve an example flow in an org scoped package', function(done) {
            var examples = {"d":{"@org_scope/node_package":{"f":["example-one"]}}};
            initLibrary({},{},examples,function(module,path) {
                return module + ':' + path
            });
            request(app)
                .get('/library/flows/_examples_/@org_scope/node_package/example-one')
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property('sendFile',
                        fspath.resolve('@org_scope/node_package') +
                        ':example-one');
                    done();
                });
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

*/
