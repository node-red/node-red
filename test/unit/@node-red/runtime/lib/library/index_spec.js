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
var fs = require("fs");

var NR_TEST_UTILS = require("nr-test-utils");
var library = NR_TEST_UTILS.require("@node-red/runtime/lib/library/index")

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
    describe("register", function() {
        // it("throws error for duplicate type", function() {
        //     library.init({});
        //     library.register("unknown","/abc");
        //     should(()=>{library.register("unknown","/abc")} ).throw();
        // })
    })
    describe("getEntry", function() {
        before(function() {
            library.init({
                log: mockLog,
                storage: {
                    getLibraryEntry: function(type,path) {
                        return Promise.resolve({type,path});
                    },
                    getFlow: function(path) {
                        return Promise.resolve({path});
                    }
                },
                nodes: {
                    getNodeExampleFlowPath: function(module,entryPath) {
                        if (module === "unknown") {
                            return null;
                        }
                        return "/tmp/"+module+"/"+entryPath;
                    }
                }
            });
            sinon.stub(fs,"readFile", function(path,opts,callback) {
                if (path === "/tmp/test-module/abc") {
                    callback(null,"Example flow result");
                } else if (path === "/tmp/@scope/test-module/abc") {
                    callback(null,"Example scope flow result");
                } else if (path === "/tmp/test-module/throw") {
                    throw new Error("Instant error")
                } else {
                    callback(new Error("Unexpected path:"+path))
                }
            })
        });
        after(function() {
            fs.readFile.restore();
        })
        it('throws error for unregistered type', function() {
            should(()=>{library.getEntry("unknown","/abc")} ).throw();
        });

        it('returns a registered non-flow entry', function(done) {
            library.register("test-module","test-type");
            library.getEntry("test-type","/abc").then(function(result) {
                result.should.have.property("type","test-type")
                result.should.have.property("path","/abc")
                done();
            }).catch(done);
        });

        it ('returns a flow entry', function(done) {
            library.getEntry("flows","/abc").then(function(result) {
                result.should.have.property("path","/abc")
                done();
            }).catch(done);
        });

        it ('returns a flow example entry', function(done) {
            library.getEntry("flows","_examples_/test-module/abc").then(function(result) {
                result.should.eql("Example flow result");
                done();
            }).catch(done);
        });

        it ('returns a flow example entry from scoped module', function(done) {
            library.getEntry("flows","_examples_/@scope/test-module/abc").then(function(result) {
                result.should.eql("Example scope flow result");
                done();
            }).catch(done);
        });
        it ('returns an error for unknown flow example entry', function(done) {
            library.getEntry("flows","_examples_/unknown/abc").then(function(result) {
                done(new Error("No error thrown"))
            }).catch(function(err) {
                err.should.have.property("code","not_found");
                done();
            });
        });
        it ('returns an error for file load error - async', function(done) {
            library.getEntry("flows","_examples_/test-module/unknown").then(function(result) {
                done(new Error("No error thrown"))
            }).catch(function(err) {
                done();
            });
        });
        it ('returns an error for file load error - sync', function(done) {
            library.getEntry("flows","_examples_/test-module/throw").then(function(result) {
                done(new Error("No error thrown"))
            }).catch(function(err) {
                done();
            });
        });
    });

    describe("saveEntry", function() {
        before(function() {
            library.init({
                log: mockLog,
                storage: {
                    saveLibraryEntry: function(type, path, meta, body) {
                        return Promise.resolve({type,path,meta,body})
                    },
                    saveFlow: function(path,body) {
                        return Promise.resolve({path,body});
                    }
                },
                nodes: {
                    getNodeExampleFlowPath: function(module,entryPath) {
                        if (module === "unknown") {
                            return null;
                        }
                        return "/tmp/"+module+"/"+entryPath;
                    }
                }
            });
        });
        it('throws error for unregistered type', function() {
            should(()=>{library.saveEntry("unknown","/abc",{id:"meta"},{id:"body"})} ).throw();
        });
        it('saves a flow entry', function(done) {
            library.saveEntry('flows','/abc',{id:"meta"},{id:"body"}).then(function(result) {
                result.should.have.property("path","/abc");
                result.should.have.property("body",{id:"body"});
                done();
            }).catch(done);
        })
        it('saves a non-flow entry', function(done) {
            library.register("test-module","test-type");
            library.saveEntry('test-type','/abc',{id:"meta"},{id:"body"}).then(function(result) {
                result.should.have.property("type","test-type");
                result.should.have.property("path","/abc");
                result.should.have.property("meta",{id:"meta"});
                result.should.have.property("body",{id:"body"});
                done();
            }).catch(done);
        })

    });
});
