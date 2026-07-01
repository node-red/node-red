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
var projects = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git");
var gitTools = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/git");
var sshTools = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/ssh");
var projectBackend = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git/Project");

describe("storage/projects/git/index", function() {
    var userDir = path.join(__dirname, ".testProjectsHome");
    var runtime;

    beforeEach(function(done) {
        runtime = {
            log: {
                _: function(key) { return key; },
                warn: sinon.stub(),
                info: sinon.stub()
            }
        };
        fs.remove(userDir, function() {
            fs.mkdir(userDir, done);
        });
    });

    afterEach(function() {
        sinon.restore();
        return fs.remove(userDir);
    });

    it("reports unavailable when projects are disabled in settings", async function() {
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(false),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"})
        };
        await projects.init({
            userDir: userDir,
            editorTheme: {
                projects: {
                    enabled: false
                }
            }
        }, runtime, mockFlowStorage);

        projects.available().should.be.false();
        runtime.log.warn.calledWith("storage.localfilesystem.projects.disabled").should.be.true();
    });

    it("logs when git support is unavailable", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves(null);
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(false),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"})
        };
        var settings = {
            userDir: userDir,
            readOnly: false,
            editorTheme: {
                projects: {
                    enabled: true
                }
            }
        };

        await projects.init(settings, runtime, mockFlowStorage);

        projects.available().should.be.false();
        runtime.log.warn.calledWith("storage.localfilesystem.projects.git-not-found").should.be.true();
    });

    it("initialises the capability and resolves project operations through the backend", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves({version:"2.43.0",user:{name:"git",email:"git@example.com"}});
        sinon.stub(projectBackend, "init");
        sinon.stub(projectBackend, "load").callsFake(function(projectPath) {
            return Promise.resolve({
                name: path.basename(projectPath),
                path: projectPath,
                missingFiles: [],
                isEmpty: function() { return false; },
                isMerging: function() { return false; }
            });
        });
        sinon.stub(projectBackend, "create").callsFake(function(user, metadata) {
            return Promise.resolve({user:user,metadata:metadata});
        });
        sinon.stub(projectBackend, "delete").callsFake(function(user, projectPath) {
            return Promise.resolve({user:user,path:projectPath});
        });
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"}),
            flowsDeclared: sinon.stub().returns(true)
        };

        var settings = {
            userDir: userDir,
            readOnly: false,
            editorTheme: {
                projects: {
                    enabled: true
                }
            }
        };

        await projects.init(settings, runtime, mockFlowStorage);
        await fs.ensureDir(path.join(userDir, "projects", "Alpha"));
        await fs.ensureDir(path.join(userDir, "projects", "beta"));

        projects.available().should.be.true();
        projects.getGlobalGitUser().should.eql({name:"git",email:"git@example.com"});
        settings.editorTheme.projects.workflow.should.eql({mode:"manual"});
        projects.flowFileExists().should.be.true();
        projects.exportFilesForEditor().should.eql({
            flow: "flows.json",
            credentials: "flows_cred.json"
        });
        (await projects.listProjects()).should.eql(["Alpha","beta"]);

        var loaded = await projects.loadInitialProject("Alpha");
        loaded.name.should.eql("Alpha");
        loaded.path.should.eql(path.join(userDir, "projects", "Alpha"));
        should(projects.getLoadError(loaded)).be.null();
        should(projects.getSaveError(loaded)).be.null();
        projects.setActiveProject(loaded);

        var created = await projects.createProject("nick", {name:"Gamma"});
        created.metadata.path.should.eql(path.join(userDir, "projects", "Gamma"));

        var deleted = await projects.deleteProject("nick", "Gamma");
        deleted.should.eql({user:"nick",path:path.join(userDir, "projects", "Gamma")});
    });

    it("passes migration metadata through to the project backend unchanged", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves({version:"2.43.0",user:{name:"git",email:"git@example.com"}});
        sinon.stub(projectBackend, "init");
        var captured;
        sinon.stub(projectBackend, "create").callsFake(function(user, metadata) {
            captured = metadata;
            return Promise.resolve({});
        });
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"})
        };
        var settings = {
            userDir: userDir,
            readOnly: false,
            editorTheme: { projects: { enabled: true } },
            get: sinon.stub().returns(undefined)
        };

        await projects.init(settings, runtime, mockFlowStorage);
        await projects.createProject("nick", { name: "Imported", files: {}, migrateFiles: true });

        captured.name.should.eql("Imported");
        captured.migrateFiles.should.be.true();
        captured.files.should.eql({});
    });

    it("returns null for initial project lookup when projects are enabled without an active selection", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves({version:"2.43.0",user:{name:"git",email:"git@example.com"}});
        sinon.stub(projectBackend, "init");
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(false),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"})
        };

        await projects.init({
            userDir: userDir,
            readOnly: false,
            editorTheme: {
                projects: {
                    enabled: true
                }
            }
        }, runtime, mockFlowStorage);

        should(await projects.loadInitialProject()).be.null();
    });

    it("returns null when flowFile is set but does not resolve to a project", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves({version:"2.43.0",user:{name:"git",email:"git@example.com"}});
        sinon.stub(projectBackend, "init");
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(false),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"})
        };

        await projects.init({
            userDir: userDir,
            readOnly: false,
            // flowFile names a flow file, not an existing project directory
            flowFile: "flows.json",
            editorTheme: {
                projects: {
                    enabled: true
                }
            }
        }, runtime, mockFlowStorage);

        should(await projects.loadInitialProject()).be.null();
    });

    it("migrates a legacy top-level credentialSecret into per-project settings on startup and later loads", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves({version:"2.43.0",user:{name:"git",email:"git@example.com"}});
        sinon.stub(projectBackend, "init");
        sinon.stub(projectBackend, "load").callsFake(function(projectPath) {
            return Promise.resolve({
                name: path.basename(projectPath),
                path: projectPath,
                credentialSecret: undefined
            });
        });
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(false),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"})
        };
        var cases = [
            { initialStore: { projects: {} } },
            { initialStore: undefined }
        ];

        for (var i = 0; i < cases.length; i += 1) {
            var projectsStore = cases[i].initialStore;
            var settings = {
                userDir: userDir,
                readOnly: false,
                flowFile: "demo",
                credentialSecret: "legacy-secret",
                editorTheme: {
                    projects: {
                        enabled: true
                    }
                },
                get: sinon.stub().callsFake(function(key) {
                    if (key === "projects") {
                        return projectsStore;
                    }
                }),
                set: sinon.stub().callsFake(function(key, value) {
                    if (key === "projects") {
                        projectsStore = value;
                    }
                    return Promise.resolve();
                })
            };

            await projects.init(settings, runtime, mockFlowStorage);

            var activeProject = await projects.loadInitialProject();
            activeProject.credentialSecret.should.eql("legacy-secret");
            projectsStore.should.eql({ projects: { demo: { credentialSecret: "legacy-secret" } } });
            settings.set.calledOnce.should.be.true();

            settings.set.resetHistory();

            var loadedProject = await projects.loadProject("demo");
            loadedProject.credentialSecret.should.eql("legacy-secret");
            settings.set.called.should.be.false();
        }
    });

    it("reports load/save error descriptors based on the active project state", async function() {
        sinon.stub(sshTools, "init").resolves();
        sinon.stub(gitTools, "init").resolves({version:"2.43.0",user:{name:"git",email:"git@example.com"}});
        sinon.stub(projectBackend, "init");
        var project = {
            name: "Alpha",
            isEmpty: sinon.stub().returns(false),
            missingFiles: [],
            isMerging: sinon.stub().returns(true)
        };
        var mockFlowStorage = {
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"flows.json",credentials:"flows_cred.json"}),
            flowsDeclared: sinon.stub().returns(true)
        };

        await projects.init({
            userDir: userDir,
            readOnly: false,
            editorTheme: { projects: { enabled: true } }
        }, runtime, mockFlowStorage);

        projects.getLoadError(project).should.eql({
            code: "git_merge_conflict",
            message: "Project has unmerged changes. Cannot load flows"
        });
        projects.getSaveError(project).should.eql({
            code: "git_merge_conflict",
            message: "Project has unmerged changes. Cannot load flows"
        });

        project.isMerging.returns(false);
        project.missingFiles = ["package.json"];
        should(projects.getSaveError(project)).be.null();
        projects.getLoadError(project).should.eql({
            code: "missing_package_file",
            message: "Project missing package.json"
        });
    });
});
