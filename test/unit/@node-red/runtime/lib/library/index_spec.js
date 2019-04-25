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
var library = NR_TEST_UTILS.require("@node-red/runtime/lib/library/index")
var localLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/library/local")
var examplesLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/library/examples")

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


describe("runtime/library", function() {
    before(function() {
        sinon.stub(localLibrary,"getEntry",function(type,path) {
            return Promise.resolve({
                library: "local",
                type:type,
                path:path
            })
        });
        sinon.stub(localLibrary,"saveEntry",function(type, path, meta, body) {
            return Promise.resolve({
                library: "local",
                type:type,
                path:path,
                meta:meta,
                body:body
            })
        });
        sinon.stub(examplesLibrary,"getEntry",function(type,path) {
            return Promise.resolve({
                library: "_examples_",
                type:type,
                path:path
            })
        });
    });
    after(function() {
        localLibrary.getEntry.restore();
        localLibrary.saveEntry.restore();
        examplesLibrary.getEntry.restore();
    })
    describe("register", function() {
        // it("throws error for duplicate type", function() {
        //     library.init({});
        //     library.register("unknown","/abc");
        //     should(()=>{library.register("unknown","/abc")} ).throw();
        // })
    })
    describe("getEntry", function() {
        before(function() {
            library.init({});
        });
        it('throws error for unregistered type', function() {
            should(()=>{library.getEntry("local","unknown","/abc")} ).throw();
        });
        it('throws error for unknown library', function() {
            should(()=>{library.getEntry("unknown","unknown","/abc")} ).throw();
        });

        it('returns a registered non-flow entry', function(done) {
            library.register("test-module","test-type");
            library.getEntry("local","test-type","/abc").then(function(result) {
                result.should.have.property("library","local")
                result.should.have.property("type","test-type")
                result.should.have.property("path","/abc")
                done();
            }).catch(done);
        });

        it ('returns a flow entry', function(done) {
            library.getEntry("local","flows","/abc").then(function(result) {
                result.should.have.property("library","local")
                result.should.have.property("path","/abc")
                done();
            }).catch(done);
        });

        it ('returns a flow example entry', function(done) {
            library.getEntry("_examples_","flows","/test-module/abc").then(function(result) {
                result.should.have.property("library","_examples_")
                result.should.have.property("path","/test-module/abc")
                done();
            }).catch(done);
        });
    });

    describe("saveEntry", function() {
        before(function() {
            library.init({});
        });
        it('throws error for unknown library', function() {
            should(()=>{library.saveEntry("unknown","unknown","/abc",{id:"meta"},{id:"body"})} ).throw();
        });
        it('throws error for unregistered type', function() {
            should(()=>{library.saveEntry("local","unknown","/abc",{id:"meta"},{id:"body"})} ).throw();
        });
        it('throws error for save to readonly library', function() {
            should(()=>{library.saveEntry("_examples_","unknown","/abc",{id:"meta"},{id:"body"})} ).throw();
        });
        it('saves a flow entry', function(done) {
            library.saveEntry('local','flows','/abc',{id:"meta"},{id:"body"}).then(function(result) {
                result.should.have.property("path","/abc");
                result.should.have.property("body",{id:"body"});
                done();
            }).catch(done);
        })
        it('saves a non-flow entry', function(done) {
            library.register("test-module","test-type");
            library.saveEntry('local','test-type','/abc',{id:"meta"},{id:"body"}).then(function(result) {
                result.should.have.property("type","test-type");
                result.should.have.property("path","/abc");
                result.should.have.property("meta",{id:"meta"});
                result.should.have.property("body",{id:"body"});
                done();
            }).catch(done);
        })

    });
});
