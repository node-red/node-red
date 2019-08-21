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
                    getEntry: function(library, type,path) {
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
            library.getEntry({library: "local",type: "known", path: "/abc"}).then(function(result) {
                result.should.eql("known")
                done();
            }).catch(done)
        })
        it("rejects a forbidden entry", function(done) {
            library.getEntry({library: "local",type: "forbidden", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","forbidden");
                err.should.have.property("status",403);
                done();
            }).catch(done)
        })
        it("rejects an unknown entry", function(done) {
            library.getEntry({library: "local",type: "not_found", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","not_found");
                err.should.have.property("status",404);
                done();
            }).catch(done)
        })
        it("rejects a blank (unknown) entry", function(done) {
            library.getEntry({library: "local",type: "blank", path: "/abc"}).then(function(result) {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","not_found");
                err.should.have.property("status",404);
                done();
            }).catch(done)
        })
        it("rejects unexpected error", function(done) {
            library.getEntry({library: "local",type: "error", path: "/abc"}).then(function(result) {
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
                    saveEntry: function(library,type,path,meta,body) {
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
            library.saveEntry({library: "local",type: "known", path: "/abc", meta: {a:1}, body:"123"}).then(function() {
                opts.should.have.property("type","known");
                opts.should.have.property("path","/abc");
                opts.should.have.property("meta",{a:1});
                opts.should.have.property("body","123");
                done();
            }).catch(done)
        })
        it("rejects a forbidden entry", function(done) {
            library.saveEntry({library: "local",type: "forbidden", path: "/abc", meta: {a:1}, body:"123"}).then(function() {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("code","forbidden");
                err.should.have.property("status",403);
                done();
            }).catch(done)
        })
        it("rejects an unknown entry", function(done) {
            library.saveEntry({library: "local",type: "not_found", path: "/abc", meta: {a:1}, body:"123"}).then(function() {
                done(new Error("did not reject"));
            }).catch(function(err) {
                err.should.have.property("status",400);
                done();
            }).catch(done)
        })
    })

});
