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

var locales = require("../../../../red/api/editor/locales");

describe("api/editor/locales", function() {
    beforeEach(function() {
    })
    afterEach(function() {
    })
    describe('get named resource catalog',function() {
        var app;
        before(function() {
            // bit of a mess of internal workings
            locales.init({
                i18n: {
                    i: {
                        language: function() { return 'en-US'},
                        changeLanguage: function(lang,callback) {
                            if (callback) {
                                callback();
                            }
                        },
                        getResourceBundle: function(lang, namespace) {
                            return {namespace:namespace, lang:lang};
                        }
                    },
                }
            });
            app = express();
            app.get(/locales\/(.+)\/?$/,locales.get);
        });
        it('returns with default language', function(done) {
            request(app)
                .get("/locales/message-catalog")
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.have.property('namespace','message-catalog');
                    done();
                });
        });
        it('returns with selected language', function(done) {
            request(app)
                .get("/locales/message-catalog?lng=fr-FR")
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.have.property('namespace','message-catalog');
                    res.body.should.have.property('lang','fr-FR');
                    done();
                });
        });
    });

    describe('get all node resource catalogs',function() {
        var app;
        before(function() {
            // bit of a mess of internal workings
            locales.init({
                i18n: {
                    i:{
                        getResourceBundle: function(lang, namespace) {
                            return {
                                "node-red": "should not return",
                                "test-module-a-id": "test-module-a-catalog",
                                "test-module-b-id": "test-module-b-catalog",
                                "test-module-c-id": "test-module-c-catalog"
                            }[namespace]
                        }
                    }
                },
                nodes: {
                    getNodeList: function() {
                        return [
                            {module:"node-red",id:"node-red-id"},
                            {module:"test-module-a",id:"test-module-a-id"},
                            {module:"test-module-b",id:"test-module-b-id"}
                        ];
                    }
                }
            });
            app = express();
            app.get("/locales/nodes",locales.getAllNodes);
        });
        it('returns with the node catalogs', function(done) {
            request(app)
                .get("/locales/nodes")
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.should.eql({
                        'test-module-a-id': 'test-module-a-catalog',
                        'test-module-b-id': 'test-module-b-catalog'
                    });
                    done();
                });
        });
    });
});
