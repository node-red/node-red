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

// Characterization tests for the git project type's WRITE path (project
// creation, migration, initialisation and file-rename). These pin the current
// single-file behaviour so that moving the write path into the storage layout
// can be done without silent regressions. They are intentionally behavioural:
// real files are written to a temp dir; only git CLI calls are stubbed.

var should = require("should");
var fs = require("fs-extra");
var path = require("path");
var sinon = require("sinon");

var NR_TEST_UTILS = require("nr-test-utils");
var Project = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/Project");
var gitTools = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/git");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/flows");
var singleFileLayout = flows.layout;

describe("storage/projects/git/Project write path", function() {
    var userDir = path.join(__dirname, ".testWritePathHome");
    var projectsDir = path.join(userDir, "projects");
    var projectsStore;
    var runtime;
    var settings;

    beforeEach(async function() {
        await fs.remove(userDir);
        await fs.ensureDir(projectsDir);
        projectsStore = { projects: {} };
        settings = {
            userDir: userDir,
            flowFilePretty: false,
            editorTheme: { projects: { workflow: { mode: "manual" } } },
            get: function(key) { return key === "projects" ? projectsStore : undefined; },
            set: function(key, value) { if (key === "projects") { projectsStore = value; } return Promise.resolve(); },
            getUserSettings: function() { return {}; }
        };
        runtime = {
            log: { _: function(k) { return k; }, trace: function() {}, warn: function() {} },
            nodes: {
                setCredentialSecret: sinon.stub(),
                exportCredentials: sinon.stub().resolves({})
            }
        };
        // The layout is initialised by the storage module in the real runtime.
        await flows.init(settings, runtime);

        // Stub everything that shells out to git; let the filesystem be real.
        sinon.stub(gitTools, "initRepo").resolves();
        sinon.stub(gitTools, "stageFile").resolves();
        sinon.stub(gitTools, "commit").resolves();
        sinon.stub(gitTools, "getRemotes").resolves({});
        sinon.stub(gitTools, "getStatus").resolves({files:{},commits:{total:0},branches:{local:[]}});

        Project.init(settings, runtime, singleFileLayout);
    });

    afterEach(async function() {
        sinon.restore();
        await fs.remove(userDir);
    });

    it("createProject builds the single-file skeleton and stages every file", async function() {
        var metadata = { name: "alpha", path: path.join(projectsDir, "alpha"), files: { flow: "flows.json" } };

        await Project.create({username:"nick"}, metadata);

        (await fs.readFile(path.join(metadata.path, "flows.json"), "utf8")).should.eql("[]");
        (await fs.readFile(path.join(metadata.path, "flows_cred.json"), "utf8")).should.eql("{}");
        fs.existsSync(path.join(metadata.path, "package.json")).should.be.true();
        fs.existsSync(path.join(metadata.path, "README.md")).should.be.true();
        fs.existsSync(path.join(metadata.path, ".gitignore")).should.be.true();

        var pkg = JSON.parse(await fs.readFile(path.join(metadata.path, "package.json"), "utf8"));
        pkg["node-red"].settings.flowFile.should.eql("flows.json");
        pkg["node-red"].settings.credentialsFile.should.eql("flows_cred.json");

        gitTools.initRepo.calledOnce.should.be.true();
        var staged = gitTools.stageFile.firstCall.args[1];
        staged.should.containEql("flows.json");
        staged.should.containEql("flows_cred.json");
        staged.should.containEql("package.json");
        gitTools.commit.firstCall.args[1].should.eql("Create project");
        projectsStore.projects.should.have.property("alpha");
    });

    it("createProject records the layout default flow manifest when no files are provided", async function() {
        var metadata = { name: "defaults", path: path.join(projectsDir, "defaults") };

        await Project.create({username:"nick"}, metadata);

        var pkg = JSON.parse(await fs.readFile(path.join(metadata.path, "package.json"), "utf8"));
        pkg["node-red"].settings.flowFile.should.eql("flows.json");
        pkg["node-red"].settings.credentialsFile.should.eql("flows_cred.json");
    });

    it("createProject migrates an existing flow file and writes the supplied credentials", async function() {
        var oldFlow = path.join(userDir, "old_flows.json");
        await fs.writeFile(oldFlow, '[{"id":"n1","type":"tab"}]');

        var metadata = {
            name: "beta",
            path: path.join(projectsDir, "beta"),
            migrateFiles: true,
            credentialSecret: "sekret",
            // The runtime exports the live credentials and hands them in.
            migratedCredentials: { n1: { token: "x" } },
            files: {
                flow: "flows.json",
                credentials: "flows_cred.json",
                oldFlow: oldFlow,
                oldCredentials: path.join(userDir, "old_cred.json")
            }
        };

        await Project.create({username:"nick"}, metadata);

        (await fs.readFile(path.join(metadata.path, "flows.json"), "utf8")).should.eql('[{"id":"n1","type":"tab"}]');
        (await fs.readFile(path.join(metadata.path, "flows_cred.json"), "utf8")).should.eql('{"n1":{"token":"x"}}');
        projectsStore.projects.beta.credentialSecret.should.eql("sekret");
    });

    it("initialise creates flow, credentials and default files then commits", async function() {
        var projectPath = path.join(projectsDir, "gamma");
        await fs.ensureDir(projectPath);

        var project = await Project.load(projectPath);
        await project.initialise({username:"nick"}, { files: { flow: "flows.json", credentials: "flows_cred.json" } });

        (await fs.readFile(path.join(projectPath, "flows.json"), "utf8")).should.eql("[]");
        (await fs.readFile(path.join(projectPath, "flows_cred.json"), "utf8")).should.eql("{}");
        fs.existsSync(path.join(projectPath, "package.json")).should.be.true();
        gitTools.commit.lastCall.args[1].should.eql("Create project files");
    });

    it("update records a renamed flow pair in package.json without moving files on disk", async function() {
        var projectPath = path.join(projectsDir, "delta");
        await fs.ensureDir(projectPath);
        await fs.writeFile(path.join(projectPath, "package.json"), JSON.stringify({
            name: "delta",
            version: "1.0.0",
            "node-red": { settings: { flowFile: "flows.json", credentialsFile: "flows_cred.json" } }
        }));
        await fs.writeFile(path.join(projectPath, "README.md"), "readme");
        await fs.writeFile(path.join(projectPath, ".gitignore"), "*.backup");
        await fs.writeFile(path.join(projectPath, "flows.json"), "[]");
        await fs.writeFile(path.join(projectPath, "flows_cred.json"), "{}");

        var project = await Project.load(projectPath);
        var result = await project.update({username:"nick"}, {
            files: { flow: "renamed.json", credentials: "renamed_cred.json" }
        });

        result.flowFilesChanged.should.be.true();
        project.package["node-red"].settings.flowFile.should.eql("renamed.json");
        var pkg = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8"));
        pkg["node-red"].settings.flowFile.should.eql("renamed.json");
        pkg["node-red"].settings.credentialsFile.should.eql("renamed_cred.json");
        // Manifest-only: the data files are not moved. The renamed pointer reads
        // as an empty project until the next save (upstream behaviour preserved).
        should(await fs.pathExists(path.join(projectPath, "flows.json"))).be.true();
        should(await fs.pathExists(path.join(projectPath, "flows_cred.json"))).be.true();
        should(await fs.pathExists(path.join(projectPath, "renamed.json"))).be.false();
        should(await fs.pathExists(path.join(projectPath, "renamed_cred.json"))).be.false();
    });
});
