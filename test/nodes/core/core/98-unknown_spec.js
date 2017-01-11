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
var unknown = require("../../../../nodes/core/core/98-unknown.js");
var helper = require("../../helper.js");

describe('unknown Node', function() {

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"unknown", name: "unknown" }];
        helper.load(unknown, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'unknown');
            done();
        });
    });

});
