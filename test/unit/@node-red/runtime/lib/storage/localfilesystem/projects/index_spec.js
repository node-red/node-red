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
var gitTools = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/projects/git");
var util = NR_TEST_UTILS.require("@node-red/util");

describe("storage/localfilesystem/projects/git/index", function() {
    afterEach(function() {
        sinon.restore();
    });

    it("allows git index stage selectors when reading conflicted files", async function() {
        var runStub = sinon.stub(util.exec, "run").resolves({ stdout: "content" });

        var content = await gitTools.getFile("/tmp/project", "flows.json", ":1");

        content.should.equal("content");
        runStub.calledOnce.should.be.true();
        runStub.firstCall.args[0].should.equal("git");
        runStub.firstCall.args[1].should.containEql("show");
        runStub.firstCall.args[1].should.containEql(":1:flows.json");
    });

    it("continues to reject invalid treeish values when reading files", async function() {
        (function() {
            gitTools.getFile("/tmp/project", "flows.json", "--upload-pack=evil");
        }).should.throw(/treeish is not a valid git revision/);
    });

    it("allows limited revision expressions when reading files", async function() {
        var runStub = sinon.stub(util.exec, "run").resolves({ stdout: "content" });

        var content = await gitTools.getFile("/tmp/project", "flows.json", "abc123~1");

        content.should.equal("content");
        runStub.calledOnce.should.be.true();
        runStub.firstCall.args[1].should.containEql("show");
        runStub.firstCall.args[1].should.containEql("abc123~1:flows.json");
    });

    it("allows limited revision expressions for commit history pagination", async function() {
        var runStub = sinon.stub(util.exec, "run");
        runStub.onFirstCall().resolves({ stdout: "10" });
        runStub.onSecondCall().resolves({ stdout: "" });

        var result = await gitTools.getCommits("/tmp/project", { before: "abc123~1", limit: 20 });

        result.should.have.property("before", "abc123~1");
        runStub.secondCall.args[1].should.containEql("abc123~1");
    });
});
