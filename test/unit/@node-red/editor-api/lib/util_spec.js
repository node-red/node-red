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

var NR_TEST_UTILS = require("nr-test-utils");

var apiUtil = NR_TEST_UTILS.require("@node-red/editor-api/lib/util");

var log = NR_TEST_UTILS.require("@node-red/util").log;
var i18n = NR_TEST_UTILS.require("@node-red/util").i18n;

describe("api/util", function() {
    describe("errorHandler", function() {
        var loggedError = null;
        var loggedEvent = null;
        var app;
        before(function() {
            app = express();
            sinon.stub(log,'error').callsFake(function(msg) {loggedError = msg;});
            sinon.stub(log,'audit').callsFake(function(event) {loggedEvent = event;});
            app.get("/tooLarge", function(req,res) {
                var err = new Error();
                err.message = "request entity too large";
                throw err;
            },apiUtil.errorHandler)
            app.get("/stack", function(req,res) {
                var err = new Error();
                err.message = "stacktrace";
                throw err;
            },apiUtil.errorHandler)
        });
        after(function() {
            log.error.restore();
            log.audit.restore();
        })
        beforeEach(function() {
            loggedError = null;
            loggedEvent = null;
        })
        it("logs an error for request entity too large", function(done) {
            request(app).get("/tooLarge").expect(400).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("error","unexpected_error");
                res.body.should.have.property("message","Error: request entity too large");

                loggedError.should.have.property("message","request entity too large");

                loggedEvent.should.have.property("event","api.error");
                loggedEvent.should.have.property("error","unexpected_error");
                loggedEvent.should.have.property("message","Error: request entity too large");
                done();
            });
        })
        it("logs an error plus stack for other errors", function(done) {
            request(app).get("/stack").expect(400).end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("error","unexpected_error");
                res.body.should.have.property("message","Error: stacktrace");

                /Error: stacktrace\s*at.*util_spec.js/m.test(loggedError).should.be.true();

                loggedEvent.should.have.property("event","api.error");
                loggedEvent.should.have.property("error","unexpected_error");
                loggedEvent.should.have.property("message","Error: stacktrace");



                done();
            });
        });
    })

    describe('determineLangFromHeaders', function() {
        var oldDefaultLang;
        before(function() {
            oldDefaultLang = i18n.defaultLang;
            i18n.defaultLang = "en-US";
        })
        after(function() {
            i18n.defaultLang = oldDefaultLang;
        })
        it('returns the default lang if non provided', function() {
            apiUtil.determineLangFromHeaders(null).should.eql("en-US");
        })
        it('returns the first language accepted', function() {
            apiUtil.determineLangFromHeaders(['fr-FR','en-GB']).should.eql("fr-FR");
        })
    })
    describe("createExpressApp", function() {
        it('parses nested query parameters as Express 4 did', function(done) {
            const app = apiUtil.createExpressApp({});
            app.get("/q", function(req,res) { res.json(req.query); });
            request(app).get("/q?a[b]=c&d=1&d=2").expect(200).end(function(err,res) {
                if (err) { return done(err); }
                res.body.should.eql({a:{b:"c"},d:["1","2"]});
                done();
            });
        });
        it('lets httpServerOptions override the query parser', function() {
            const app = apiUtil.createExpressApp({httpServerOptions:{"query parser":"simple"}});
            app.get("query parser").should.equal("simple");
        });
    });
    describe("wildcardParam", function() {
        it('joins the segments of an Express 5 named wildcard', function() {
            apiUtil.wildcardParam({params:{path:["a","b","c.json"]}},"path").should.equal("a/b/c.json");
        });
        it('returns a string parameter unchanged', function() {
            apiUtil.wildcardParam({params:{path:"a/b"}},"path").should.equal("a/b");
        });
        it('returns undefined when the parameter is absent', function() {
            should(apiUtil.wildcardParam({params:{}},"path")).be.undefined();
        });
    });
    describe("skipIfBodyParsed", function() {
        function run(req) {
            let parsed = false, nexted = false;
            apiUtil.skipIfBodyParsed(function(req,res,next) { parsed = true; next(); })(req, {}, function() { nexted = true; });
            return {parsed, nexted};
        }
        it('runs the parser when the body has not been read', function() {
            run({}).should.eql({parsed:true, nexted:true});
        });
        it('skips the parser when body-parser already marked the body as read', function() {
            run({_body:true}).should.eql({parsed:false, nexted:true});
        });
        it('skips the parser when another parser has consumed the stream', function() {
            run({readableEnded:true, body:{a:1}}).should.eql({parsed:false, nexted:true});
        });
    });
});
