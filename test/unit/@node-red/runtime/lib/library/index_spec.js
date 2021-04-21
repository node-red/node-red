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

const NR_TEST_UTILS = require("nr-test-utils");
const library = NR_TEST_UTILS.require("@node-red/runtime/lib/library/index")
const localLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/library/local")
const examplesLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/library/examples")
const events = NR_TEST_UTILS.require("@node-red/util/lib/events")

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
        sinon.stub(localLibrary,"getEntry").callsFake(function(type,path) {
            return Promise.resolve({
                library: "local",
                type:type,
                path:path
            })
        });
        sinon.stub(localLibrary,"saveEntry").callsFake(function(type, path, meta, body) {
            return Promise.resolve({
                library: "local",
                type:type,
                path:path,
                meta:meta,
                body:body
            })
        });
        sinon.stub(examplesLibrary,"getEntry").callsFake(function(type,path) {
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

    describe("getLibraries", function() {
        before(function() {
            library.init({});
        });
        it('returns the default and examples libraries', function() {
            const libs = library.getLibraries();
            libs.should.have.length(2);
            libs[0].should.have.property('id', 'local');
            libs[0].should.have.property('label','editor:library.types.local');
            libs[0].should.have.property("user", false);
            libs[0].should.have.property('icon', 'font-awesome/fa-hdd-o');

            libs[1].should.have.property('id', 'examples');
            libs[1].should.have.property('label','editor:library.types.examples');
            libs[1].should.have.property("user", false);
            libs[1].should.have.property('icon', 'font-awesome/fa-life-ring');
            libs[1].should.have.property('readOnly', true);
            libs[1].should.have.property('types', ['flows']);
        });

        it('returns the libraries from settings', function() {
            library.init({
                plugins: {
                    getPlugin: id => { return {
                            id: "test-library-plugin",
                            type: "node-red-library-source",
                            class: function() {}
                        }
                    }
                },
                settings: {
                    editorTheme: {
                        library: {
                            sources: [
                                {id: "test-plugin-id", type:"test-library-plugin"}
                            ]
                        }
                    }
                }
            });
            let libs = library.getLibraries();
            libs.should.have.length(2);

            events.emit("registry:plugin-added","test-library-plugin" )

            libs = library.getLibraries();
            libs.should.have.length(3);
            libs[2].should.have.property('id', 'test-plugin-id');
            libs[2].should.have.property("user", false);
        });
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
            library.getEntry("examples","flows","/test-module/abc").then(function(result) {
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
