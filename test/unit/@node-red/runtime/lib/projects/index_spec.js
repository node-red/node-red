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
var runtimeProjects = NR_TEST_UTILS.require("@node-red/runtime/lib/projects");
var gitProjectType = NR_TEST_UTILS.require("@node-red/runtime/lib/projects/git");

function createLog() {
    return {
        _: function(key) { return key; },
        info: sinon.stub(),
        warn: sinon.stub()
    };
}

function createRuntime(overrides) {
    var projectSettings = {
        activeProject: undefined,
        projects: {}
    };
    var runtime = {
        log: createLog(),
        storage: {
            saveCredentials: sinon.stub().resolves()
        },
        settings: {
            editorTheme: {
                projects: {
                    workflow: {
                        mode: "manual"
                    }
                }
            },
            get: function(key) {
                if (key === "projects") {
                    return projectSettings;
                }
            },
            set: sinon.stub().callsFake(function(key, value) {
                if (key === "projects") {
                    projectSettings = value;
                }
                return Promise.resolve();
            }),
            getUserSettings: sinon.stub().returns({})
        },
        nodes: {
            stopFlows: sinon.stub().resolves(),
            clearContext: sinon.stub().resolves(),
            loadFlows: sinon.stub().resolves(),
            setCredentialSecret: sinon.stub(),
            clearCredentials: sinon.stub(),
            exportCredentials: sinon.stub().resolves({test:true})
        },
        events: {
            emit: sinon.stub()
        }
    };
    return Object.assign(runtime, overrides || {});
}

// Register a mock capability as a selectable project type and return the
// storage fields a module would expose to select it.
function capabilityStorage(capability, extra) {
    capability.init = capability.init || sinon.stub().resolves();
    runtimeProjects.registerProjectType("test", capability);
    return Object.assign({
        getProjectType: function() { return "test"; },
        getProjectLayout: function() { return {}; },
        saveCredentials: sinon.stub().resolves()
    }, extra || {});
}

function createProject(name, overrides) {
    return Object.assign({
        name: name,
        credentialSecret: "secret",
        credentialSecretInvalid: false,
        missingFiles: [],
        getFlowFile: sinon.stub().returns("flows.json"),
        getFlowFileBackup: sinon.stub().returns(".flows.json.backup"),
        getCredentialsFile: sinon.stub().returns("flows_cred.json"),
        getCredentialsFileBackup: sinon.stub().returns(".flows_cred.json.backup"),
        listAutosaveFiles: sinon.stub().returns(["flows.json","flows_cred.json"]),
        isEmpty: sinon.stub().returns(false),
        isMerging: sinon.stub().returns(false),
        stageFile: sinon.stub().resolves(),
        status: sinon.stub().resolves({files:{flow:{status:"M "}}}),
        commit: sinon.stub().resolves(),
        export: sinon.stub().returns({name:name})
    }, overrides || {});
}

describe("runtime/projects", function() {
    afterEach(function() {
        sinon.restore();
    });

    it("is unavailable when storage does not expose a project capability", async function() {
        var runtime = createRuntime();
        await runtimeProjects.init(runtime);
        runtimeProjects.available().should.be.false();
    });

    it("selects a built-in project type and drives it with the storage module's project layout", async function() {
        sinon.stub(gitProjectType, "init").resolves();
        sinon.stub(gitProjectType, "available").returns(false);
        var layout = { marker: "single-file-layout" };
        var runtime = createRuntime({
            storage: {
                getProjectType: function() { return "git"; },
                getProjectLayout: function() { return layout; }
            }
        });

        await runtimeProjects.init(runtime);

        gitProjectType.init.calledOnce.should.be.true();
        gitProjectType.init.calledWith(runtime.settings, runtime, layout).should.be.true();
        runtimeProjects.available().should.be.false();
    });

    it("ignores an unknown project type declared by the storage module", async function() {
        var runtime = createRuntime({
            storage: {
                getProjectType: function() { return "does-not-exist"; },
                getProjectLayout: function() { return {}; }
            }
        });

        await runtimeProjects.init(runtime);

        runtimeProjects.available().should.be.false();
    });

    it("initialises active project state and wires the storage layout into the selected project type", async function() {
        var activeProject = createProject("loaded-project");
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(activeProject),
            setActiveProject: sinon.stub(),
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            getGlobalGitUser: sinon.stub().returns({name:"git",email:"git@example.com"}),
            ssh: {}
        };
        var runtime = createRuntime({
            storage: capabilityStorage(capability),
            settings: {
                editorTheme: { projects: { workflow: { mode: "manual" } } },
                get: function(key) {
                    if (key === "projects") {
                        return {activeProject:"configured-name",projects:{}};
                    }
                },
                set: sinon.stub().resolves(),
                getUserSettings: sinon.stub().returns({})
            }
        });

        await runtimeProjects.init(runtime);

        runtimeProjects.available().should.be.true();
        runtimeProjects.getActiveProject().should.equal(activeProject);
        runtime.settings.set.calledOnce.should.be.true();
        capability.setActiveProject.calledWith(activeProject).should.be.true();
        runtimeProjects.flowFileExists().should.be.true();
        runtimeProjects.getDefaultProjectFilesForEditor().should.eql({flow:"flows.json",credentials:"flows_cred.json"});
        runtimeProjects.getGlobalGitUser().should.eql({name:"git",email:"git@example.com"});
    });

    it("throws the selected project type's load/save errors as coded Errors", async function() {
        var activeProject = createProject("loaded-project");
        var loadError = { code: "missing_flow_file", message: "Project has no flow file" };
        var saveError = { code: "git_merge_conflict", message: "Project has unmerged changes. Cannot load flows" };
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(activeProject),
            setActiveProject: sinon.stub(),
            getLoadError: sinon.stub().returns(loadError),
            getSaveError: sinon.stub().returns(saveError),
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            ssh: {}
        };
        var runtime = createRuntime({
            storage: capabilityStorage(capability)
        });

        await runtimeProjects.init(runtime);

        try {
            runtimeProjects.assertCanLoadFlows();
            throw new Error("assertCanLoadFlows should have thrown");
        } catch (err) {
            err.code.should.eql("missing_flow_file");
            err.message.should.eql("Project has no flow file");
        }
        try {
            runtimeProjects.assertCanSaveFlows();
            throw new Error("assertCanSaveFlows should have thrown");
        } catch (err) {
            err.code.should.eql("git_merge_conflict");
            err.message.should.eql("Project has unmerged changes. Cannot load flows");
        }
        capability.getLoadError.calledWith(activeProject).should.be.true();
        capability.getSaveError.calledWith(activeProject).should.be.true();
    });

    it("treats flow load/save admission as a no-op when no project is active", async function() {
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(null),
            setActiveProject: sinon.stub(),
            getLoadError: sinon.stub().returns({ code: "git_merge_conflict", message: "nope" }),
            getSaveError: sinon.stub().returns({ code: "git_merge_conflict", message: "nope" }),
            flowFileExists: sinon.stub().returns(false),
            exportFilesForEditor: sinon.stub().returns({}),
            ssh: {}
        };
        var runtime = createRuntime({
            storage: capabilityStorage(capability)
        });

        await runtimeProjects.init(runtime);

        // No active project: nothing to gate, and the project type is never asked.
        runtimeProjects.assertCanLoadFlows();
        runtimeProjects.assertCanSaveFlows();
        capability.getLoadError.called.should.be.false();
        capability.getSaveError.called.should.be.false();
    });

    it("normalises persisted project settings state before resolving the active project", async function() {
        var activeProject = createProject("configured-name");
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(activeProject),
            setActiveProject: sinon.stub(),
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            ssh: {}
        };
        var cases = [
            { initial: { activeProject: "configured-name" } },
            { initial: { activeProject: "configured-name", projects: null } }
        ];

        for (var i = 0; i < cases.length; i += 1) {
            var settingsStore = cases[i].initial;
            var runtime = createRuntime({
                storage: capabilityStorage(capability),
                settings: {
                    editorTheme: { projects: { workflow: { mode: "manual" } } },
                    get: function(key) {
                        if (key === "projects") {
                            return settingsStore;
                        }
                    },
                    set: sinon.stub().callsFake(function(key, value) {
                        if (key === "projects") {
                            settingsStore = value;
                        }
                        return Promise.resolve();
                    }),
                    getUserSettings: sinon.stub().returns({})
                }
            });

            await runtimeProjects.init(runtime);

            capability.loadInitialProject.calledWith("configured-name").should.be.true();
            runtime.settings.set.calledOnce.should.be.true();
            settingsStore.should.eql({ activeProject: "configured-name", projects: {} });
            capability.loadInitialProject.resetHistory();
        }
    });

    it("switches the active project and reloads flows from the runtime service", async function() {
        var loadedProject = createProject("demo");
        var loadProject = sinon.stub().resolves(loadedProject);
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(null),
            setActiveProject: sinon.stub(),
            loadProject: loadProject,
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            ssh: {}
        };
        var runtime = createRuntime({
            storage: capabilityStorage(capability)
        });

        await runtimeProjects.init(runtime);
        await runtimeProjects.setActiveProject({username:"nick"}, "demo", true);

        loadProject.calledWith("demo").should.be.true();
        runtime.settings.set.calledOnce.should.be.true();
        capability.setActiveProject.calledWith(loadedProject).should.be.true();
        runtime.nodes.stopFlows.calledOnce.should.be.true();
        runtime.nodes.clearContext.calledOnce.should.be.true();
        runtime.nodes.loadFlows.calledWith(true).should.be.true();
        runtime.events.emit.calledWith("runtime-event", {
            id: "project-update",
            payload: { project: "demo", action: "loaded" }
        }).should.be.true();
    });

    it("auto-stages and auto-commits tracked files after flow saves in auto workflow mode", async function() {
        var activeProject = createProject("auto-project");
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(activeProject),
            setActiveProject: sinon.stub(),
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            ssh: {}
        };
        var runtime = createRuntime({
            storage: capabilityStorage(capability),
            settings: {
                editorTheme: { projects: { workflow: { mode: "manual" } } },
                get: function(key) {
                    if (key === "projects") {
                        return {activeProject:"auto-project",projects:{}};
                    }
                },
                set: sinon.stub().resolves(),
                getUserSettings: sinon.stub().returns({
                    git: {
                        workflow: {
                            mode: "auto"
                        }
                    }
                })
            }
        });

        await runtimeProjects.init(runtime);
        await runtimeProjects.handleFlowFileSave({username:"nick"});

        activeProject.stageFile.calledWith(["flows.json","flows_cred.json"]).should.be.true();
        activeProject.status.calledWith({username:"nick"}, false).should.be.true();
        activeProject.commit.calledWith({username:"nick"}, {message:"Update flow files"}).should.be.true();
    });

    it("exports the live credentials and hands them to the backend when migrating an install", async function() {
        var imported = createProject("imported");
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(null),
            setActiveProject: sinon.stub(),
            createProject: sinon.stub().resolves({ name: "imported" }),
            loadProject: sinon.stub().resolves(imported),
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            ssh: {}
        };
        var projectsStore = { projects: {} };
        var runtime = createRuntime({
            storage: capabilityStorage(capability),
            settings: {
                editorTheme: { projects: { workflow: { mode: "manual" } } },
                get: function(key) {
                    if (key === "projects") { return projectsStore; }
                    if (key === "credentialSecret") { return "live-key"; }
                },
                set: sinon.stub().resolves(),
                getUserSettings: sinon.stub().returns({})
            }
        });
        runtime.nodes.exportCredentials = sinon.stub().resolves({ n1: { token: "x" } });

        await runtimeProjects.init(runtime);
        var metadata = { name: "imported", files: {}, migrateFiles: true };
        await runtimeProjects.createProject({username:"nick"}, metadata);

        // The runtime is re-keyed to the project's secret before export, so the
        // exported credentials are encrypted with the key the project records.
        runtime.nodes.setCredentialSecret.calledWith("live-key").should.be.true();
        metadata.migratedCredentials.should.eql({ n1: { token: "x" } });
        capability.createProject.firstCall.args[1].migratedCredentials.should.eql({ n1: { token: "x" } });
    });

    it("re-keys for migration but does not activate the project if creation fails", async function() {
        var createError = new Error("create failed");
        var capability = {
            available: function() { return true; },
            loadInitialProject: sinon.stub().resolves(null),
            setActiveProject: sinon.stub(),
            createProject: sinon.stub().rejects(createError),
            loadProject: sinon.stub(),
            flowFileExists: sinon.stub().returns(true),
            exportFilesForEditor: sinon.stub().returns({flow:"/tmp/flows.json",credentials:"/tmp/flows_cred.json"}),
            ssh: {}
        };
        var projectsStore = { projects: {} };
        var runtime = createRuntime({
            storage: capabilityStorage(capability),
            settings: {
                editorTheme: { projects: { workflow: { mode: "manual" } } },
                get: function(key) {
                    if (key === "projects") { return projectsStore; }
                    if (key === "credentialSecret") { return "live-key"; }
                },
                set: sinon.stub().resolves(),
                getUserSettings: sinon.stub().returns({})
            }
        });
        runtime.nodes.exportCredentials = sinon.stub().resolves({ n1: { token: "x" } });

        await runtimeProjects.init(runtime);
        var metadata = { name: "imported", files: {}, migrateFiles: true };
        capability.setActiveProject.calledOnceWith(null).should.be.true();

        await runtimeProjects.createProject({username:"nick"}, metadata).should.be.rejectedWith(createError);

        // Migration re-keys to encrypt the exported credentials with the project
        // key; but a failed creation must not load or activate the new project.
        runtime.nodes.setCredentialSecret.calledWith("live-key").should.be.true();
        capability.loadProject.called.should.be.false();
        capability.setActiveProject.calledOnceWith(null).should.be.true();
    });
});
