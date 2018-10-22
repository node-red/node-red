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
var index = NR_TEST_UTILS.require("@node-red/runtime/lib/api/index");


describe("runtime-api/index", function() {
    before(function() {
        ["comms","flows","nodes","settings","library","projects"].forEach(n => {
            sinon.stub(NR_TEST_UTILS.require(`@node-red/runtime/lib/api/${n}`),"init",()=>{});
        })
    });
    after(function() {
        ["comms","flows","nodes","settings","library","projects"].forEach(n => {
            NR_TEST_UTILS.require(`@node-red/runtime/lib/api/${n}`).init.restore()
        })
    })
    it('isStarted', function(done) {
        index.init({
            isStarted: ()=>true
        });
        index.isStarted({}).then(function(started) {
            started.should.be.true();
            done();
        }).catch(done);
    })

    it('isStarted', function(done) {
        index.init({
            version: ()=>"1.2.3.4"
        });
        index.version({}).then(function(version) {
            version.should.eql("1.2.3.4");
            done();
        }).catch(done);
    })

});
