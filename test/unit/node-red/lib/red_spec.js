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
var path = require("path");


var NR_TEST_UTILS = require("nr-test-utils");

var api = NR_TEST_UTILS.require("@node-red/runtime/lib/api");

var RED = NR_TEST_UTILS.require("node-red");

var runtime = NR_TEST_UTILS.require("@node-red/runtime");
var api = NR_TEST_UTILS.require("@node-red/runtime/lib/api");


describe("red/red", function() {

    // describe("check build", function() {
    //     beforeEach(function() {
    //         sinon.stub(runtime,"init",function() {});
    //         sinon.stub(api,"init",function() {});
    //         // sinon.stub(RED,"version",function() { return "version";});
    //     });
    //     afterEach(function() {
    //         runtime.init.restore();
    //         api.init.restore();
    //         fs.statSync.restore();
    //         // RED.version.restore();
    //     });
    //     it.skip('warns if build has not been run',function() {
    //         sinon.stub(fs,"statSync",function() { throw new Error();});
    //
    //         /*jshint immed: false */
    //         (function() {
    //             RED.init({},{});
    //         }).should.throw("Node-RED not built");
    //     });
    //     it('passed if build has been run',function() {
    //         sinon.stub(fs,"statSync",function() { });
    //         RED.init({},{});
    //     });
    // });

    describe("externals", function() {
        it('reports version', function() {
            /\d+\.\d+\.\d+(-git)?/.test(RED.version()).should.be.true();
        });
        it.skip('access server externals', function() {
            // TODO: unstubable accessors - need to make this testable
            // RED.app;
            // RED.httpAdmin;
            // RED.httpNode;
            // RED.server;
        });
        it.skip('only initialises api component if httpAdmin enabled');
        it.skip('stubs httpAdmin if httpAdmin disabled');
        it.skip('stubs httpNode if httpNode disabled');
    });

});
