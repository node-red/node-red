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

var credentials = require("../../../red/api/credentials");

describe('credentials api', function() {
    var app;

    before(function() {
        app = express();
        app.get('/credentials/:type/:id',credentials.get);
        credentials.init({
            log:{audit:function(){}},
            nodes:{
                getCredentials: function(id) {
                    if (id === "n1") {
                        return {user1:"abc",password1:"123"};
                    } else {
                        return null;
                    }
                },
                getCredentialDefinition:function(type) {
                    if (type === "known-type") {
                        return {user1:{type:"text"},password1:{type:"password"}};
                    } else {
                        return null;
                    }
                }
            }
        });
    });
    it('returns empty credentials if unknown type',function(done) {
        request(app)
            .get("/credentials/unknown-type/n1")
            .expect(200)
            .expect("Content-Type",/json/)
            .end(function(err,res) {
                if (err) {
                    done(err);
                } else {
                    try {
                        res.body.should.eql({});
                        done();
                    } catch(e) {
                        done(e);
                    }
                }
            })
    });
    it('returns empty credentials if none are stored',function(done) {
        request(app)
            .get("/credentials/known-type/n2")
            .expect("Content-Type",/json/)
            .end(function(err,res) {
                if (err) {
                    done(err);
                } else {
                    try {
                        res.body.should.eql({});
                        done();
                    } catch(e) {
                        done(e);
                    }
                }
            })
    });
    it('returns stored credentials',function(done) {
        request(app)
            .get("/credentials/known-type/n1")
            .expect("Content-Type",/json/)
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

});
