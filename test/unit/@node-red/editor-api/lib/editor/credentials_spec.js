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
var sinon = require('sinon');
var when = require('when');

var NR_TEST_UTILS = require("nr-test-utils");

var credentials = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/credentials");

describe('api/editor/credentials', function() {
    var app;

    before(function() {
        app = express();
        app.get('/credentials/:type/:id',credentials.get);
        credentials.init({
            flows: {
                getNodeCredentials: function(opts) {
                    if (opts.type === "known-type" && opts.id === "n1") {
                        return Promise.resolve({
                            user1:"abc",
                            has_password1: true
                        });
                    } else {
                        var err = new Error("message");
                        err.code = "test_code";
                        var p = Promise.reject(err);
                        p.catch(()=>{});
                        return p;
                    }
                }
            }
        });
    });

    it('returns stored credentials',function(done) {
        request(app)
            .get("/credentials/known-type/n1")
            .expect("Content-Type",/json/)
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    done(err);
                } else {
                    try {
                        res.body.should.have.a.property("user1","abc");
                        res.body.should.not.have.a.property("password1");
                        res.body.should.have.a.property("has_password1",true);
                        done();
                    } catch(e) {
                        done(e);
                    }
                }
            })
    });
    it('returns any error',function(done) {
        request(app)
            .get("/credentials/unknown-type/n2")
            .expect("Content-Type",/json/)
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    done(err);
                } else {
                    try {
                        res.body.should.have.property('code');
                        res.body.code.should.be.equal("test_code");
                        res.body.should.have.property('message');
                        res.body.message.should.be.equal('message');
                        done();
                    } catch(e) {
                        done(e);
                    }
                }
            })
    });

});
