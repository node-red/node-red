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

var NR_TEST_UTILS = require("nr-test-utils");

var locales = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/locales");
var i18n = NR_TEST_UTILS.require("@node-red/util").i18n;

describe("api/editor/locales", function() {
    beforeEach(function() {
    })
    afterEach(function() {
    })
    describe('get named resource catalog',function() {
        var app;
        before(function() {
            // locales.init({
            //     i18n: {
            //         i: {
            //             language: function() { return 'en-US'},
            //             changeLanguage: function(lang,callback) {
            //                 if (callback) {
            //                     callback();
            //                 }
            //             },
            //             getResourceBundle: function(lang, namespace) {
            //                 return {namespace:namespace, lang:lang};
            //             }
            //         },
            //     }
            // });
            locales.init({});

            // bit of a mess of internal workings
            sinon.stub(i18n.i,'changeLanguage',function(lang,callback) { if (callback) {callback();}});
            if (i18n.i.getResourceBundle) {
                sinon.stub(i18n.i,'getResourceBundle',function(lang, namespace) {return {namespace:namespace, lang:lang};});
            } else {
                // If i18n.init has not been called, then getResourceBundle isn't
                // defined - so hardcode a stub
                i18n.i.getResourceBundle = function(lang, namespace) {return {namespace:namespace, lang:lang};};
                i18n.i.getResourceBundle.restore = function() { delete i18n.i.getResourceBundle };
            }
            app = express();
            app.get(/locales\/(.+)\/?$/,locales.get);
        });
        after(function() {
            i18n.i.changeLanguage.restore();
            i18n.i.getResourceBundle.restore();
        })
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

        it('returns for locale defined only with primary tag ', function(done) {
            var orig = i18n.i.getResourceBundle;
            i18n.i.getResourceBundle = function (lang, ns) {
                if (lang === "ja-JP") {
                    return undefined;
                }
                return orig(lang, ns);
            };
            request(app)
                 // returns `ja` instead of `ja-JP`
                .get("/locales/message-catalog?lng=ja-JP")
                .expect(200)
                .end(function(err,res) {
                    i18n.i.getResourceBundle = orig;
                    if (err) {
                        return done(err);
                    }
                    res.body.should.have.property('namespace','message-catalog');
                    res.body.should.have.property('lang','ja');
                    done();
                });
        });

    });

    // describe('get all node resource catalogs',function() {
    //     var app;
    //     before(function() {
    //         // bit of a mess of internal workings
    //         sinon.stub(i18n,'catalog',function(namespace, lang) {
    //                     return {
    //                         "node-red": "should not return",
    //                         "test-module-a-id": "test-module-a-catalog",
    //                         "test-module-b-id": "test-module-b-catalog",
    //                         "test-module-c-id": "test-module-c-catalog"
    //                     }[namespace]
    //                 });
    //         locales.init({
    //             nodes: {
    //                 getNodeList: function(opts) {
    //                     return Promise.resolve([
    //                         {module:"node-red",id:"node-red-id"},
    //                         {module:"test-module-a",id:"test-module-a-id"},
    //                         {module:"test-module-b",id:"test-module-b-id"}
    //                     ]);
    //                 }
    //             }
    //         });
    //         app = express();
    //         app.get("/locales/nodes",locales.getAllNodes);
    //     });
    //     after(function() {
    //         i18n.catalog.restore();
    //     })
    //     it('returns with the node catalogs', function(done) {
    //         request(app)
    //             .get("/locales/nodes")
    //             .expect(200)
    //             .end(function(err,res) {
    //                 if (err) {
    //                     return done(err);
    //                 }
    //                 res.body.should.eql({
    //                     'test-module-a-id': 'test-module-a-catalog',
    //                     'test-module-b-id': 'test-module-b-catalog'
    //                 });
    //                 done();
    //             });
    //     });
    // });
});
