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
const registryUtil = NR_TEST_UTILS.require("@node-red/registry/lib/util");

// Get the internal runtime api
const runtime = NR_TEST_UTILS.require("@node-red/runtime")._;

const i18n = NR_TEST_UTILS.require("@node-red/util").i18n;

describe("red/nodes/registry/util",function() {
    describe("createNodeApi", function() {
        let i18n_;
        let registerType;
        let registerSubflow;

        before(function() {
            i18n_ = sinon.stub(i18n,"_").callsFake(function() {
                return Array.prototype.slice.call(arguments,0);
            })
            registerType = sinon.stub(runtime.nodes,"registerType");
            registerSubflow = sinon.stub(runtime.nodes,"registerSubflow");
        });
        after(function() {
            i18n_.restore();
            registerType.restore();
            registerSubflow.restore();
        })

        it("builds node-specific view of runtime api", function() {
            registryUtil.init(runtime);
            var result = registryUtil.createNodeApi({id: "my-node", namespace: "my-namespace"})
            // Need a better strategy here.
            // For now, validate the node-custom functions

            var message = result._("message");
            // This should prepend the node's namespace to the message
            message.should.eql([ 'my-namespace:message' ]);

            var nodeConstructor = () => {};
            var nodeOpts = {};
            result.nodes.registerType("type",nodeConstructor, nodeOpts);
            registerType.called.should.be.true();
            registerType.lastCall.args[0].should.eql("my-node")
            registerType.lastCall.args[1].should.eql("type")
            registerType.lastCall.args[2].should.eql(nodeConstructor)
            registerType.lastCall.args[3].should.eql(nodeOpts)

            var subflowDef = {};
            result.nodes.registerSubflow(subflowDef);
            registerSubflow.called.should.be.true();
            registerSubflow.lastCall.args[0].should.eql("my-node")
            registerSubflow.lastCall.args[1].should.eql(subflowDef)

        });
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
