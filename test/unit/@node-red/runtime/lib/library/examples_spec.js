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

describe("runtime/library/examples", function() {
    describe("getEntry", function() {
        before(function() {
            examplesLibrary.init({
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
                    getNodeExampleFlows: function() {
                        return {
                            "test-module": {
                                f: ["abc"]
                            },
                            "@scope/test-module": {
                                f: ["abc","throw"]
                            }

                        }
                    },
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

        it ('returns a flow example entry', function(done) {
            examplesLibrary.getEntry("flows","test-module/abc").then(function(result) {
                result.should.eql("Example flow result");
                done();
            }).catch(done);
        });

        it ('returns a flow example listing - top level', function(done) {
            examplesLibrary.getEntry("flows","").then(function(result) {
                result.should.eql([ 'test-module', '@scope/test-module' ])
                done();
            }).catch(done);
        });
        it ('returns a flow example listing - in module', function(done) {
            examplesLibrary.getEntry("flows","test-module").then(function(result) {
                result.should.eql([{ fn: 'abc' }])
                done();
            }).catch(done);
        });
        it ('returns a flow example listing - in scoped module', function(done) {
            examplesLibrary.getEntry("flows","@scope/test-module").then(function(result) {
                result.should.eql([{ fn: 'abc' }, {fn: 'throw'}])
                done();
            }).catch(done);
        });
        it ('returns a flow example entry from scoped module', function(done) {
            examplesLibrary.getEntry("flows","@scope/test-module/abc").then(function(result) {
                result.should.eql("Example scope flow result");
                done();
            }).catch(done);
        });
        it ('returns an error for unknown flow example entry', function(done) {
            examplesLibrary.getEntry("flows","unknown/abc").then(function(result) {
                done(new Error("No error thrown"))
            }).catch(function(err) {
                err.should.have.property("code","not_found");
                done();
            });
        });
        it ('returns an error for file load error - async', function(done) {
            examplesLibrary.getEntry("flows","test-module/unknown").then(function(result) {
                done(new Error("No error thrown"))
            }).catch(function(err) {
                done();
            });
        });
        it ('returns an error for file load error - sync', function(done) {
            examplesLibrary.getEntry("flows","test-module/throw").then(function(result) {
                done(new Error("No error thrown"))
            }).catch(function(err) {
                done();
            });
        });
    });
});
