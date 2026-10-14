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

    describe("isUnmerged", function() {
        it("lists the unmerged index entries for the file", async function() {
            var runStub = sinon.stub(util.exec, "run").resolves({ stdout: "" });

            await gitTools.isUnmerged("/tmp/project", "flows.json");

            runStub.calledOnce.should.be.true();
            runStub.firstCall.args[0].should.equal("git");
            runStub.firstCall.args[1].should.containEql("ls-files");
            runStub.firstCall.args[1].should.containEql("-u");
            runStub.firstCall.args[2].should.have.property("cwd","/tmp/project");
        });

        it("passes the file as a literal pathspec", async function() {
            // Without :(literal), a file name containing glob characters would
            // match *other* conflicted files and wrongly report a conflict
            var runStub = sinon.stub(util.exec, "run").resolves({ stdout: "" });

            await gitTools.isUnmerged("/tmp/project", "*");

            runStub.firstCall.args[1].should.containEql("--");
            runStub.firstCall.args[1].should.containEql(":(literal)*");
            runStub.firstCall.args[1].should.not.containEql("*");
        });

        it("reports a conflict when the file has unmerged entries", async function() {
            sinon.stub(util.exec, "run").resolves({ stdout:
                "100644 df967b96a579e45a18b8251732d16804b2e56a55 1\tflows.json\n"+
                "100644 b19a1e93bec1317dc6097229e12afaffbfa74dc2 2\tflows.json\n"+
                "100644 950b81b7eee953d050aa05a641f8e056c85dd1bd 3\tflows.json\n"
            });

            (await gitTools.isUnmerged("/tmp/project", "flows.json")).should.be.true();
        });

        it("reports no conflict when there are no unmerged entries", async function() {
            sinon.stub(util.exec, "run").resolves({ stdout: "\n" });

            (await gitTools.isUnmerged("/tmp/project", "flows.json")).should.be.false();
        });

        it("rejects a file name that would be parsed as an option", function() {
            (function() {
                gitTools.isUnmerged("/tmp/project", "--upload-pack=evil");
            }).should.throw(/file path must not start with/);
        });
    });
});
