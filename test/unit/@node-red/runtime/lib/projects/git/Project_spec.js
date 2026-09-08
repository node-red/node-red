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
var fs = require("fs-extra");
var path = require("path");
var sinon = require("sinon");

var NR_TEST_UTILS = require("nr-test-utils");
var Project = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/Project");
var gitTools = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/git");
// The git project type is format-blind; it is driven by a storage layout.
// localfilesystem flows is the canonical single-file layout.
var singleFileLayout = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/flows").layout;

describe("storage/projects/git/Project", function() {
    var userDir = path.join(__dirname, ".testProjectHome");
    var projectPath = path.join(userDir, "projects", "demo");
    var projectSettings;

    beforeEach(async function() {
        await fs.remove(userDir);
        await fs.ensureDir(projectPath);
        await fs.writeFile(path.join(projectPath, "package.json"), JSON.stringify({
            name: "demo",
            version: "1.0.0",
            description: "Demo project",
            "node-red": {
                settings: {
                    flowFile: "flows.json",
                    credentialsFile: "flows_cred.json"
                }
            }
        }));
        await fs.writeFile(path.join(projectPath, "README.md"), "Demo readme");
        await fs.writeFile(path.join(projectPath, "flows.json"), "[]");
        await fs.writeFile(path.join(projectPath, "flows_cred.json"), "{}");

        sinon.stub(gitTools, "getRemotes").resolves({});
        sinon.stub(gitTools, "getStatus").resolves({
            files: {},
            commits: {total: 1},
            branches: {local:["main"],remote:"origin/main"}
        });

        projectSettings = {projects:{}};
        Project.init({
            userDir: userDir,
            editorTheme: {
                projects: {}
            },
            get: function(key) {
                if (key === "projects") {
                    return projectSettings;
                }
            }
        }, {
            log: {
                _: function(key) { return key; }
            }
        }, singleFileLayout);
    });

    afterEach(async function() {
        sinon.restore();
        await fs.remove(userDir);
    });

    it("loads tracked file metadata for the canonical single-file flow representation", async function() {
        var project = await Project.load(projectPath);
        project.listAutosaveFiles().should.eql([
            "flows.json",
            "flows_cred.json"
        ]);
        project.export().should.eql({
            name: "demo",
            summary: "Demo project",
            version: "1.0.0",
            description: "Demo readme",
            dependencies: {},
            empty: undefined,
            settings: {
                credentialsEncrypted: false,
                credentialSecretInvalid: undefined
            },
            files: {
                package: "package.json",
                flow: "flows.json",
                credentials: "flows_cred.json"
            },
            git: {
                remotes: {},
                branches: {
                    local: ["main"],
                    remote: "origin/main"
                }
            }
        });
    });

    it("loads safely when persisted project settings are missing the projects map", async function() {
        projectSettings = {};

        var project = await Project.load(projectPath);

        project.name.should.eql("demo");
        project.paths.root.should.eql("");
    });

    it("loads safely when persisted project settings contain a malformed projects map", async function() {
        projectSettings = {projects:null};

        var project = await Project.load(projectPath);

        project.name.should.eql("demo");
        project.paths.root.should.eql("");
    });

    it("rejects an update with an invalid package filename", async function() {
        var project = await Project.load(projectPath);

        await project.update({username:"nick"}, { files: { package: "notapackage.txt" } })
            .should.be.rejectedWith(/Invalid package file/);
    });
});
