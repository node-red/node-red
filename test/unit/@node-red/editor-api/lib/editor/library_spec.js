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
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');

var NR_TEST_UTILS = require("nr-test-utils");

var library = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/library");

var app;

describe("api/editor/library", function() {

    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get(/library\/([^\/]+)\/([^\/]+)(?:$|\/(.*))/,library.getEntry);
        app.post(/library\/([^\/]+)\/([^\/]+)\/(.*)/,library.saveEntry);
    });
    after(function() {
    });

    it('returns an individual entry - flow type', function(done) {
        var opts;
        library.init({
            library: {
                getEntry: function(_opts) {
                    opts = _opts;
                    return Promise.resolve('{"a":1,"b":2}');
                }
            }
        });
        request(app)
            .get('/library/local/flows/abc')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property('a',1);
                res.body.should.have.property('b',2);
                opts.should.have.property('library','local');
                opts.should.have.property('type','flows');
                opts.should.have.property('path','abc');
                done();
            });
    })
    it('returns a directory listing - flow type', function(done) {
        var opts;
        library.init({
            library: {
                getEntry: function(_opts) {
                    opts = _opts;
                    return Promise.resolve({"a":1,"b":2});
                }
            }
        });
        request(app)
            .get('/library/local/flows/abc/def')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property('a',1);
                res.body.should.have.property('b',2);
                opts.should.have.property('library','local');
                opts.should.have.property('type','flows');
                opts.should.have.property('path','abc/def');
                done();
            });
    })
    it('returns an individual entry - non-flow type', function(done) {
        var opts;
        library.init({
            library: {
                getEntry: function(_opts) {
                    opts = _opts;
                    return Promise.resolve('{"a":1,"b":2}');
                }
            }
        });
        request(app)
            .get('/library/local/non-flow/abc')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                opts.should.have.property('library','local');
                opts.should.have.property('type','non-flow');
                opts.should.have.property('path','abc');
                res.text.should.eql('{"a":1,"b":2}');
                done();
            });
    })
    it('returns a directory listing - non-flow type', function(done) {
        var opts;
        library.init({
            library: {
                getEntry: function(_opts) {
                    opts = _opts;
                    return Promise.resolve({"a":1,"b":2});
                }
            }
        });
        request(app)
            .get('/library/local/non-flow/abc/def')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property('a',1);
                res.body.should.have.property('b',2);
                opts.should.have.property('library','local');
                opts.should.have.property('type','non-flow');
                opts.should.have.property('path','abc/def');
                done();
            });
    })

    it('returns an error on individual get', function(done) {
        var opts;
        library.init({
            library: {
                getEntry: function(_opts) {
                    opts = _opts;
                    var err = new Error("message");
                    err.code = "random_error";
                    err.status = 400;
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
            }
        });
        request(app)
            .get('/library/local/flows/123')
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                opts.should.have.property('library','local');
                opts.should.have.property('type','flows');
                opts.should.have.property('path','123');

                res.body.should.have.property('code');
                res.body.code.should.be.equal("random_error");
                res.body.should.have.property('message');
                res.body.message.should.be.equal("message");
                done();
            });
    });


    it('saves an individual entry - flow type', function(done) {
        var opts;
        library.init({
            library: {
                saveEntry: function(_opts) {
                    opts = _opts;
                    return Promise.resolve();
                }
            }
        });
        request(app)
            .post('/library/local/flows/abc/def')
            .expect(204)
            .send({a:1,b:2,c:3})
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                opts.should.have.property('library','local');
                opts.should.have.property('type','flows');
                opts.should.have.property('path','abc/def');
                opts.should.have.property('meta',{});
                opts.should.have.property('body',JSON.stringify({a:1,b:2,c:3}));
                done();
            });
    })

    it('saves an individual entry - non-flow type', function(done) {
        var opts;
        library.init({
            library: {
                saveEntry: function(_opts) {
                    opts = _opts;
                    return Promise.resolve();
                }
            }
        });
        request(app)
            .post('/library/local/non-flow/abc/def')
            .expect(204)
            .send({a:1,b:2,text:"123"})
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                opts.should.have.property('library','local');
                opts.should.have.property('type','non-flow');
                opts.should.have.property('path','abc/def');
                opts.should.have.property('meta',{a:1,b:2});
                opts.should.have.property('body',"123");
                done();
            });
    })

    it('returns an error on individual save', function(done) {
        var opts;
        library.init({
            library: {
                saveEntry: function(_opts) {
                    opts = _opts;
                    var err = new Error("message");
                    err.code = "random_error";
                    err.status = 400;
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
            }
        });
        request(app)
            .post('/library/local/non-flow/abc/def')
            .send({a:1,b:2,text:"123"})
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                opts.should.have.property('type','non-flow');
                opts.should.have.property('library','local');
                opts.should.have.property('path','abc/def');

                res.body.should.have.property('code');
                res.body.code.should.be.equal("random_error");
                res.body.should.have.property('message');
                res.body.message.should.be.equal("message");
                done();
            });
    });
});
