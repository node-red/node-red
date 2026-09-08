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

var NR_TEST_UTILS = require("nr-test-utils");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/flows");

describe("storage/localfilesystem/flows", function() {
    var userDir = path.join(__dirname, ".testFlowStorageHome");
    var runtime;

    beforeEach(function(done) {
        runtime = {
            projects: {
                // flows.js reads the active project from the runtime; project-state
                // admission (merge conflicts etc.) is gated by the storage facade,
                // not here. See storage/index_spec.js.
                getActiveProject: function() { return null; }
            }
        };
        fs.remove(userDir, function() {
            fs.mkdir(userDir, done);
        });
    });

    afterEach(function(done) {
        fs.remove(userDir, done);
    });

    it("resolves the default flow and credentials paths", async function() {
        var flowFile = path.join(userDir, "flows.json");
        await flows.init({userDir:userDir, flowFile:flowFile}, runtime);

        await flows.saveFlows([{id:"1",type:"tab"}]);
        await flows.saveCredentials({n1:{token:"x"}});

        fs.existsSync(flowFile).should.be.true();
        fs.existsSync(path.join(userDir, "flows_cred.json")).should.be.true();
    });

    it("resolves an active project's files from the project the git type hands it", async function() {
        runtime.projects.getActiveProject = function() {
            return {
                path: path.join(userDir, "projects/demo"),
                paths: { root: "" },
                package: { "node-red": { settings: {
                    flowFile: "custom-flow.json",
                    credentialsFile: "custom-flow_cred.json"
                } } }
            };
        };
        await flows.init({userDir:userDir}, runtime);

        var current = flows.layout.exportFilesForEditor(runtime.projects.getActiveProject());
        current.flow.should.eql("custom-flow.json");
        current.credentials.should.eql("custom-flow_cred.json");
    });

    it("fails flow reads when the active project resolves no flow file", async function() {
        var flowFile = path.join(userDir, "flows.json");
        runtime.projects.getActiveProject = function() {
            return {
                path: path.join(userDir, "projects/demo"),
                paths: { root: "" },
                package: { "node-red": { settings: {} } }
            };
        };
        await flows.init({userDir:userDir, flowFile:flowFile}, runtime);

        await flows.getFlows().should.be.rejectedWith(/Project has no flow file/);
    });

    it("does not fall back to the default flow file for a project that resolves no flow file", async function() {
        var defaultFlowFile = path.join(userDir, "default-flows.json");
        runtime.projects.getActiveProject = function() {
            return {
                path: path.join(userDir, "projects/demo"),
                paths: { root: "" },
                package: { "node-red": { settings: {} } }
            };
        };
        await flows.init({userDir:userDir, flowFile:defaultFlowFile}, runtime);

        // Saving must error rather than silently write project flows to the
        // global default file.
        await flows.saveFlows([{id:"1",type:"tab"}]).should.be.rejected();
        fs.existsSync(defaultFlowFile).should.be.false();
    });

    it("restores the backup file when the flow file is empty", async function() {
        var flowFile = path.join(userDir, "flows.json");
        var flowFileBackup = path.join(userDir, ".flows.json.backup");
        await flows.init({userDir:userDir, flowFile:flowFile}, runtime);
        fs.closeSync(fs.openSync(flowFile, "w"));
        await fs.writeFile(flowFileBackup, JSON.stringify([{id:"1"}]));

        var loadedFlows = await flows.getFlows();
        loadedFlows.should.eql([{id:"1"}]);
        flows.layout.flowFileExists().should.be.true();
    });

    it("writes pretty JSON for project flows by default", async function() {
        var flowFile = path.join(userDir, "projects/demo/flows.json");
        var credentialsFile = path.join(userDir, "projects/demo/flows_cred.json");
        await fs.ensureDir(path.dirname(flowFile));
        runtime.projects.getActiveProject = function() {
            return {
                path: path.join(userDir, "projects/demo"),
                paths: { root: "" },
                package: { "node-red": { settings: {
                    flowFile: "flows.json",
                    credentialsFile: "flows_cred.json"
                } } }
            };
        };
        await flows.init({userDir:userDir}, runtime);

        await flows.saveFlows([{id:"1",type:"tab"}]);
        await flows.saveCredentials({a:"b"});

        var flowContents = await fs.readFile(flowFile, "utf8");
        var credentialContents = await fs.readFile(credentialsFile, "utf8");
        flowContents.should.match(/\n    /);
        credentialContents.should.match(/\n    /);
    });

    it("writes compact JSON when flowFilePretty is false", async function() {
        var flowFile = path.join(userDir, "compact.json");
        await flows.init({userDir:userDir, flowFilePretty:false, flowFile:flowFile}, runtime);
        await flows.saveFlows([{id:"1",type:"tab"}]);

        var flowContents = await fs.readFile(flowFile, "utf8");
        flowContents.should.eql(JSON.stringify([{id:"1",type:"tab"}]));
    });

    describe("project write path", function() {
        beforeEach(async function() {
            await flows.init({userDir:userDir, flowFile:"myflows.json"}, runtime);
        });

        it("createFiles writes the requested flow/credentials files and stages them", async function() {
            var cases = [
                {
                    projectPath: path.join(userDir, "projects", "demo-derived"),
                    files: { flow: "flows.json" },
                    expectedCredentials: "flows_cred.json"
                },
                {
                    projectPath: path.join(userDir, "projects", "demo-explicit"),
                    files: { flow: "flows.json", credentials: "secrets.json" },
                    expectedCredentials: "secrets.json"
                }
            ];

            for (var i = 0; i < cases.length; i += 1) {
                var testCase = cases[i];
                await fs.ensureDir(testCase.projectPath);
                var project = {
                    path: testCase.projectPath,
                    files: Object.assign({}, testCase.files)
                };
                var result = flows.layout.createFiles(project);
                await result.write;

                project.files.credentials.should.eql(testCase.expectedCredentials);
                result.files.should.eql(["flows.json", testCase.expectedCredentials]);
                (await fs.readFile(path.join(testCase.projectPath, "flows.json"), "utf8")).should.eql("[]");
                (await fs.readFile(path.join(testCase.projectPath, testCase.expectedCredentials), "utf8")).should.eql("{}");
            }
        });

        it("createFiles derives the default single-file manifest when no files are provided", async function() {
            var projectPath = path.join(userDir, "projects", "demo-defaults");
            await fs.ensureDir(projectPath);
            var project = {
                path: projectPath
            };

            var result = flows.layout.createFiles(project);
            await result.write;

            project.files.should.eql({ flow: "flows.json", credentials: "flows_cred.json" });
            result.files.should.eql(["flows.json", "flows_cred.json"]);
        });

        it("createFiles rejects a credentials path outside the project", function() {
            (function() {
                flows.layout.createFiles({
                    path: path.join(userDir, "projects", "demo"),
                    files: { flow: "flows.json", credentials: "../escape_cred.json" }
                });
            }).should.throw(/outside the project directory/);
        });

        it("createFiles rejects a flow path outside the project", function() {
            (function() {
                flows.layout.createFiles({
                    path: path.join(userDir, "projects", "demo"),
                    files: { flow: "../escape.json" }
                });
            }).should.throw(/outside the project directory/);
        });

        it("migrateFiles fills source/target files from the default install and writes exported credentials", async function() {
            var projectPath = path.join(userDir, "projects", "mig");
            await fs.ensureDir(projectPath);
            var oldFlow = path.join(userDir, "myflows.json");
            await fs.writeFile(oldFlow, '[{"id":"n1"}]');
            var project = {
                path: projectPath,
                files: {},
                // The runtime exports/re-keys the live credentials and hands them
                // over here before migrateFiles runs.
                migratedCredentials: { n1: { token: "x" } }
            };

            var result = flows.layout.migrateFiles(project);
            project.files.flow.should.eql("myflows.json");
            project.files.credentials.should.eql("myflows_cred.json");
            project.files.oldFlow.should.eql(path.join(userDir, "myflows.json"));
            project.files.oldCredentials.should.eql(path.join(userDir, "myflows_cred.json"));
            result.files.should.eql(["myflows.json", "myflows_cred.json"]);

            await result.write;
            (await fs.readFile(path.join(projectPath, "myflows.json"), "utf8")).should.eql('[{"id":"n1"}]');
            (await fs.readFile(path.join(projectPath, "myflows_cred.json"), "utf8")).should.eql('{"n1":{"token":"x"}}');
        });

        it("buildPackageSettings writes the single-file manifest into package settings", function() {
            var project = {
                path: path.join(userDir, "projects", "demo"),
                paths: { root: "nested/" }
            };
            var nodeRedSettings = {};
            flows.layout.buildPackageSettings(project, nodeRedSettings, { flow: "nested/flows.json", credentials: "nested/flows_cred.json" });
            nodeRedSettings.flowFile.should.eql("flows.json");
            nodeRedSettings.credentialsFile.should.eql("flows_cred.json");
        });

        it("updateFiles records the renamed manifest without moving files on disk", async function() {
            var projectPath = path.join(userDir, "projects", "demo");
            await fs.ensureDir(path.join(projectPath, "nested"));
            await fs.writeFile(path.join(projectPath, "nested", "flows.json"), "[]");
            await fs.writeFile(path.join(projectPath, "nested", "flows_cred.json"), "{}");
            var project = {
                path: projectPath,
                paths: { root: "nested/" },
                package: { "node-red": { settings: { flowFile: "flows.json", credentialsFile: "flows_cred.json" } } }
            };
            var result = flows.layout.updateFiles(project, { flow: "nested/renamed.json", credentials: "nested/renamed_cred.json" });
            result.changed.should.be.true();
            await result.write;

            // The manifest is repointed (root-stripped)...
            project.package["node-red"].settings.flowFile.should.eql("renamed.json");
            project.package["node-red"].settings.credentialsFile.should.eql("renamed_cred.json");
            // ...but nothing on disk is moved: originals stay, new names are not
            // created. The pointer reads as an empty project until the next save.
            should(await fs.pathExists(path.join(projectPath, "nested", "flows.json"))).be.true();
            should(await fs.pathExists(path.join(projectPath, "nested", "flows_cred.json"))).be.true();
            should(await fs.pathExists(path.join(projectPath, "nested", "renamed.json"))).be.false();
            should(await fs.pathExists(path.join(projectPath, "nested", "renamed_cred.json"))).be.false();
        });

        it("updateFiles reports no change when the manifest already matches", function() {
            var project = {
                path: path.join(userDir, "projects", "demo"),
                paths: { root: "nested/" },
                package: { "node-red": { settings: { flowFile: "flows.json", credentialsFile: "flows_cred.json" } } }
            };
            var result = flows.layout.updateFiles(project, { flow: "nested/flows.json", credentials: "nested/flows_cred.json" });
            result.changed.should.be.false();
        });

        it("resolves no flow files when the package declares settings without a flowFile", function() {
            var project = {
                path: path.join(userDir, "projects", "demo"),
                paths: { root: "" },
                package: { "node-red": { settings: {} } }
            };
            flows.layout.listAutosaveFiles(project).should.eql([]);
            flows.layout.exportFilesForEditor(project).should.eql({ flow: undefined, credentials: undefined });
            flows.layout.flowsDeclared(project).should.be.false();
        });

        it("treats a credentials-only manifest as missing flow files", function() {
            var project = {
                path: path.join(userDir, "projects", "demo"),
                paths: { root: "" },
                package: { "node-red": { settings: { credentialsFile: "flows_cred.json" } } }
            };
            flows.layout.listAutosaveFiles(project).should.eql(["flows_cred.json"]);
            flows.layout.flowsDeclared(project).should.be.false();
        });
    });
});
