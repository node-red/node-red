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

const should = require("should");
const sinon = require("sinon");
const express = require("express");
const request = require("supertest");
const NR_TEST_UTILS = require("nr-test-utils");

const compat = NR_TEST_UTILS.require("@node-red/runtime/lib/express4compat");
const { log } = NR_TEST_UTILS.require("@node-red/util");

describe("runtime/express4compat", function() {
    let warn;
    beforeEach(function() {
        compat._reset();
        warn = sinon.stub(log, "warn");
    });
    afterEach(function() {
        warn.restore();
    });

    function app() {
        return compat.apply(express());
    }

    describe("convertPath", function() {
        it("leaves Express 5 paths alone", function() {
            compat.convertPath("/a/*path").should.eql({ path: "/a/*path", wildcards: 0 });
            compat.convertPath("/a/:id").should.eql({ path: "/a/:id", wildcards: 0 });
        });
        it("names unnamed wildcards", function() {
            compat.convertPath("/a/*").should.eql({ path: "/a/{*__express4_wildcard_0}", wildcards: 1 });
        });
        it("converts optional parameters", function() {
            compat.convertPath("/a/:id?").should.eql({ path: "/a{/:id}", wildcards: 0 });
        });
        it("builds the same layer regexp Express 4 did", function() {
            compat.express4LayerRegexp("/uibtest", false).toString().should.equal("/^\\/uibtest\\/?(?=\\/|$)/i");
            compat.express4LayerRegexp("/", false).toString().should.equal("/^\\/?(?=\\/|$)/i");
            compat.express4LayerRegexp("/a/*", true).toString().should.equal("/^\\/a\\/(.*)\\/?$/i");
            compat.express4LayerRegexp("/x.json", true).toString().should.equal("/^\\/x\\.json\\/?$/i");
        });
        it("passes non-string paths through", function() {
            const re = /^\/x/;
            compat.convertPath(re).path.should.equal(re);
        });
    });

    describe("routes", function() {
        it("registers an Express 4 wildcard route and restores req.params[0]", function() {
            const a = app();
            a.get("/my-node/*", (req, res) => res.send(req.params[0]));
            return request(a).get("/my-node/js/lib/file.js").expect(200, "js/lib/file.js").then(function() {
                warn.calledOnce.should.be.true();
                warn.firstCall.args[0].should.match(/\/my-node\/\*/);
            });
        });
        it("matches the bare prefix with an empty wildcard, as Express 4 did", function() {
            const a = app();
            a.get("/my-node/*", (req, res) => res.send("[" + req.params[0] + "]"));
            return request(a).get("/my-node/").expect(200, "[]");
        });
        it("supports optional parameters", function() {
            const a = app();
            a.get("/items/:id?", (req, res) => res.send(req.params.id || "all"));
            return request(a).get("/items").expect(200, "all").then(function() {
                return request(a).get("/items/42").expect(200, "42");
            });
        });
        it("warns only once per path", function() {
            const a = app();
            a.get("/x/*", (req, res) => res.send("1"));
            a.post("/x/*", (req, res) => res.send("2"));
            warn.calledOnce.should.be.true();
        });
        it("does not warn for Express 5 routes", function() {
            const a = app();
            a.get("/x/*path", (req, res) => res.send("ok"));
            warn.called.should.be.false();
        });
        it("still reads settings with app.get(name)", function() {
            const a = app();
            a.set("foo", "bar");
            a.get("foo").should.equal("bar");
        });
    });

    describe("request and response methods", function() {
        it("res.send(status) sends the status", function() {
            const a = app();
            a.get("/s", (req, res) => res.send(404));
            return request(a).get("/s").expect(404);
        });
        it("res.send(body, status) and res.json(obj, status) set the status", function() {
            const a = app();
            a.get("/b", (req, res) => res.send("nope", 400));
            a.get("/j", (req, res) => res.json({ ok: false }, 500));
            return request(a).get("/b").expect(400, "nope").then(function() {
                return request(a).get("/j").expect(500, { ok: false });
            });
        });
        it("req.param() looks in params, body and query", function() {
            const a = app();
            a.get("/p/:id", (req, res) => res.send(req.param("id") + "," + req.param("q") + "," + req.param("none", "d")));
            return request(a).get("/p/7?q=x").expect(200, "7,x,d");
        });
        it("res.sendfile() calls res.sendFile()", function() {
            const a = app();
            a.get("/f", (req, res) => res.sendfile(__filename));
            return request(a).get("/f").expect(200);
        });
        it("keeps writes to req.query", function() {
            const a = app();
            a.use((req, res, next) => { delete req.query.token; req.query.added = "1"; next(); });
            a.get("/q", (req, res) => res.json(req.query));
            return request(a).get("/q?token=secret&a=b").expect(200, { a: "b", added: "1" });
        });
        it("restores Express 4 layer.regexp so nodes can find their routes", function() {
            const a = app();
            a.use("/uibtest", (req, res, next) => next());
            a.get("/foo/:id", (req, res) => res.send("ok"));
            const stack = a._router.stack;
            const mounted = stack.find(l => l.regexp && l.regexp.toString() === "/^\\/uibtest\\/?(?=\\/|$)/i");
            should.exist(mounted);
            const route = stack.find(l => l.route && l.route.path === "/foo/:id");
            route.regexp.toString().should.equal("/^\\/foo(?:\\/([^/]+?))\\/?$/i");
            // the same pattern uibuilder uses to remove its router on redeploy
            a._router.stack.forEach((l, i, routes) => { if (l.regexp.toString() === "/^\\/uibtest\\/?(?=\\/|$)/i") { routes.splice(i, 1); } });
            should.not.exist(a._router.stack.find(l => l === mounted));
        });
        it("app._router returns app.router", function() {
            const a = app();
            a.get("/r", (req, res) => res.send("ok"));
            a._router.should.equal(a.router);
            a._router.stack.length.should.be.above(0);
        });
    });
});
