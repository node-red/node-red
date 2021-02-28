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
const NR_TEST_UTILS = require("nr-test-utils");
const registryUtil = NR_TEST_UTILS.require("@node-red/registry/lib/util");


describe("red/nodes/registry/util",function() {
    describe("createNodeApi", function() {
        it.skip("needs tests");
    });
    describe("checkModuleAllowed", function() {
        function checkList(module, version, allowList, denyList) {
            return registryUtil.checkModuleAllowed(
                module,
                version,
                registryUtil.parseModuleList(allowList),
                registryUtil.parseModuleList(denyList)
            )
        }

        it("allows module with no allow/deny list provided", function() {
            checkList("abc","1.2.3",[],[]).should.be.true();
        })
        it("defaults allow to * when only deny list is provided", function() {
            checkList("abc","1.2.3",["*"],["def"]).should.be.true();
            checkList("def","1.2.3",["*"],["def"]).should.be.false();
        })
        it("uses most specific matching rule", function() {
            checkList("abc","1.2.3",["ab*"],["a*"]).should.be.true();
            checkList("def","1.2.3",["d*"],["de*"]).should.be.false();
        })
        it("checks version string using semver rules", function() {
            // Deny
            checkList("abc","1.2.3",["abc@1.2.2"],["*"]).should.be.false();
            checkList("abc","1.2.3",["abc@1.2.4"],["*"]).should.be.false();
            checkList("abc","1.2.3",["abc@>1.2.3"],["*"]).should.be.false();
            checkList("abc","1.2.3",["abc@>=1.2.3"],["abc"]).should.be.false();


            checkList("node-red-contrib-foo","1.2.3",["*"],["*contrib*"]).should.be.false();


            // Allow
            checkList("abc","1.2.3",["abc@1.2.3"],["*"]).should.be.true();
            checkList("abc","1.2.3",["abc@<1.2.4"],["*"]).should.be.true();
            checkList("abc","1.2.3",["abc"],["abc@>1.2.3"]).should.be.true();
            checkList("abc","1.2.3",["abc"],["abc@<1.2.3||>1.2.3"]).should.be.true();
            checkList("node-red-contrib-foo","1.2.3",["*contrib*"],["*"]).should.be.true();
        })

    })
});
