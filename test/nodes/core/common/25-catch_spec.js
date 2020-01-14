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
var catchNode = require("nr-test-utils").require("@node-red/nodes/core/common/25-catch.js");
var helper = require("node-red-node-test-helper");

describe('catch Node', function() {

    afterEach(function() {
        helper.unload();
    });

    it('should output a message when called', function(done) {
        var flow = [ { id:"n1", type:"catch", name:"catch", wires:[["n2"]] },
            {id:"n2", type:"helper"} ];
        helper.load(catchNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.should.have.property('name', 'catch');
            n2.on("input", function(msg) {
                msg.should.be.a.Error();
                msg.toString().should.equal("Error: big error");
                done();
            });
            var err = new Error("big error");
            n1.emit("input", err);
        });
    });

});
