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
var path = require("path");
var when = require("when");
var fs = require("fs");

var NR_TEST_UTILS = require("nr-test-utils");

var registry = NR_TEST_UTILS.require("@node-red/registry");

var installer = NR_TEST_UTILS.require("@node-red/registry/lib/installer");
var loader = NR_TEST_UTILS.require("@node-red/registry/lib/loader");
var typeRegistry = NR_TEST_UTILS.require("@node-red/registry/lib/registry");

describe('red/registry/index', function() {
    var stubs = [];
    afterEach(function() {
        while(stubs.length) {
            stubs.pop().restore();
        }
    })
    describe('#init',function() {
        it('intialises components', function() {
            stubs.push(sinon.stub(installer,"init"));
            stubs.push(sinon.stub(loader,"init"));
            stubs.push(sinon.stub(typeRegistry,"init"));

            registry.init({});
            installer.init.called.should.be.true();
            loader.init.called.should.be.true();
            typeRegistry.init.called.should.be.true();
        })
    });

    describe('#addModule', function() {
        it('loads the module and returns its info', function(done) {
            stubs.push(sinon.stub(loader,"addModule",function(module) {
                return when.resolve();
            }));
            stubs.push(sinon.stub(typeRegistry,"getModuleInfo", function(module) {
                return "info";
            }));
            registry.addModule("foo").then(function(info) {
                info.should.eql("info");
                done();
            }).catch(function(err) { done(err); });
        });
        it('rejects if loader rejects', function(done) {
            stubs.push(sinon.stub(loader,"addModule",function(module) {
                return when.reject("error");
            }));
            stubs.push(sinon.stub(typeRegistry,"getModuleInfo", function(module) {
                return "info";
            }));
            registry.addModule("foo").then(function(info) {
                done(new Error("unexpected resolve"));
            }).catch(function(err) {
                err.should.eql("error");
                done();
            })
        });
    });

    describe('#enableNode',function() {
        it('enables a node set',function(done) {
            stubs.push(sinon.stub(typeRegistry,"enableNodeSet",function() {
                return when.resolve();
            }));
            stubs.push(sinon.stub(typeRegistry,"getNodeInfo", function() {
                return {id:"node-set",loaded:true};
            }));
            registry.enableNode("node-set").then(function(ns) {
                typeRegistry.enableNodeSet.called.should.be.true();
                ns.should.have.a.property('id','node-set');
                done();
            }).catch(function(err) { done(err); });
        });

        it('rejects if node unknown',function() {
            stubs.push(sinon.stub(typeRegistry,"enableNodeSet",function() {
                throw new Error('failure');
            }));
            /*jshint immed: false */
            (function(){
                registry.enableNode("node-set")
            }).should.throw();
        });

        it('triggers a node load',function(done) {
            stubs.push(sinon.stub(typeRegistry,"enableNodeSet",function() {
                return when.resolve();
            }));
            var calls = 0;
            stubs.push(sinon.stub(typeRegistry,"getNodeInfo", function() {
                // loaded=false on first call, true on subsequent
                return {id:"node-set",loaded:(calls++>0)};
            }));
            stubs.push(sinon.stub(loader,"loadNodeSet",function(){return when.resolve();}));
            stubs.push(sinon.stub(typeRegistry,"getFullNodeInfo"));

            registry.enableNode("node-set").then(function(ns) {
                typeRegistry.enableNodeSet.called.should.be.true();
                loader.loadNodeSet.called.should.be.true();
                ns.should.have.a.property('id','node-set');
                ns.should.have.a.property('loaded',true);
                done();
            }).catch(function(err) { done(err); });
        });

    });

});
