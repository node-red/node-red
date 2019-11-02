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
var localLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/library/local")

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

describe("runtime/library/local", function() {

    describe("getEntry", function() {
        before(function() {
            localLibrary.init({
                log: mockLog,
                storage: {
                    getLibraryEntry: function(type,path) {
                        return Promise.resolve({type,path});
                    }
                }
            });
        });

        it('returns a registered non-flow entry', function(done) {
            localLibrary.getEntry("test-type","/abc").then(function(result) {
                result.should.have.property("type","test-type")
                result.should.have.property("path","/abc")
                done();
            }).catch(done);
        });

        it ('returns a flow entry', function(done) {
            localLibrary.getEntry("flows","/abc").then(function(result) {
                result.should.have.property("path","/abc")
                done();
            }).catch(done);
        });
    });

    describe("saveEntry", function() {
        before(function() {
            localLibrary.init({
                log: mockLog,
                storage: {
                    saveLibraryEntry: function(type, path, meta, body) {
                        return Promise.resolve({type,path,meta,body})
                    }
                }
            });
        });
        it('saves a flow entry', function(done) {
            localLibrary.saveEntry('flows','/abc',{id:"meta"},{id:"body"}).then(function(result) {
                result.should.have.property("path","/abc");
                result.should.have.property("body",{id:"body"});
                done();
            }).catch(done);
        })
        it('saves a non-flow entry', function(done) {
            localLibrary.saveEntry('test-type','/abc',{id:"meta"},{id:"body"}).then(function(result) {
                result.should.have.property("type","test-type");
                result.should.have.property("path","/abc");
                result.should.have.property("meta",{id:"meta"});
                result.should.have.property("body",{id:"body"});
                done();
            }).catch(done);
        })

    });
});
