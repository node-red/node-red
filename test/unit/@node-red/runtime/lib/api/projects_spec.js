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
var projects = NR_TEST_UTILS.require("@node-red/runtime/lib/api/projects");

function mockLog() {
    return {
        log: sinon.stub(),
        debug: sinon.stub(),
        trace: sinon.stub(),
        warn: sinon.stub(),
        info: sinon.stub(),
        metric: sinon.stub(),
        audit: sinon.stub(),
        _: function() { return "abc"; }
    };
}

function rejectedError() {
    var err = new Error("error");
    err.code = "error";
    var p = Promise.reject(err);
    p.catch(function() {});
    return p;
}

function createRuntime(projectMethods) {
    return {
        log: mockLog(),
        storage: {
            projects: Object.assign({
                available: function() { return true; }
            }, projectMethods)
        }
    };
}

function assertRejects(promiseFactory, done, status) {
    promiseFactory().then(function() {
        done(new Error("Did not reject internal error"));
    }).catch(function(err) {
        err.should.have.property("code", "error");
        if (status) {
            err.should.have.property("status", status);
        }
        done();
    }).catch(done);
}

describe("runtime-api/projects", function() {
    describe("available", function() {
        it("resolves true if projects available", function(done) {
            projects.init({ storage: { projects: {} } });
            projects.available().then(function(result) {
                result.should.be.true();
                done();
            }).catch(done);
        });

        it("resolves false if projects unavailable", function(done) {
            projects.init({ storage: {} });
            projects.available().then(function(result) {
                result.should.be.false();
                done();
            }).catch(done);
        });
    });

    describe("listProjects", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                listProjects: sinon.spy(function(user) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve([1,2,3]);
                }),
                getActiveProject: function(user) {
                    if (user === "noActive") {
                        return null;
                    }
                    return {name:"aProject"};
                }
            });
            projects.init(runtime);
        });

        it("lists the projects, without an active project", function(done) {
            projects.listProjects({user:"noActive"}).then(function(result) {
                result.should.have.property("projects",[1,2,3]);
                result.should.not.have.property("active");
                done();
            }).catch(done);
        });

        it("lists the projects, with an active project", function(done) {
            projects.listProjects({user:"foo"}).then(function(result) {
                result.should.have.property("projects",[1,2,3]);
                result.should.have.property("active","aProject");
                done();
            }).catch(done);
        });

        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.listProjects({user:"error"});
            }, done, 400);
        });
    });

    describe("createProject", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                createProject: sinon.spy(function(user, project) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve(project);
                })
            });
            projects.init(runtime);
        });

        it("creates project", function(done) {
            projects.createProject({user:"known",project:{a:1}}).then(function(result) {
                result.should.eql({a:1});
                done();
            }).catch(done);
        });

        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.createProject({user:"error"});
            }, done);
        });
    });

    describe("initialiseProject", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                initialiseProject: sinon.spy(function(user, id, project) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve({id:id,project:project});
                })
            });
            projects.init(runtime);
        });

        it("initialises project", function(done) {
            projects.initialiseProject({user:"known",id:123,project:{a:1}}).then(function(result) {
                result.should.eql({id:123,project:{a:1}});
                done();
            }).catch(done);
        });

        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.initialiseProject({user:"error"});
            }, done);
        });
    });

    describe("getActiveProject", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                getActiveProject: sinon.spy(function(user) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve("123");
                })
            });
            projects.init(runtime);
        });

        it("returns active project", function(done) {
            projects.getActiveProject({user:"known"}).then(function(result) {
                result.should.eql("123");
                done();
            }).catch(done);
        });

        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.getActiveProject({user:"error"});
            }, done);
        });
    });

    describe("setActiveProject", function() {
        var activeProject;
        var runtime;

        beforeEach(function() {
            runtime = createRuntime({
                getActiveProject: sinon.spy(function() { return activeProject; }),
                setActiveProject: sinon.spy(function(user, id) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve({user:user,id:id});
                })
            });
            projects.init(runtime);
        });

        it("sets project if current project is unset", function(done) {
            activeProject = null;
            projects.setActiveProject({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });

        it("sets project if current project is different", function(done) {
            activeProject = {name:456};
            projects.setActiveProject({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });

        it("no-ops if current project is same", function(done) {
            activeProject = {name:123};
            projects.setActiveProject({user:"known",id:123}).then(function(result) {
                should(result).be.undefined();
                done();
            }).catch(done);
        });

        it("rejects with internal error", function(done) {
            activeProject = null;
            assertRejects(function() {
                return projects.setActiveProject({user:"error"});
            }, done);
        });
    });

    function addPassThroughSuite(name, methodName, opts, expected) {
        describe(name, function() {
            var runtime;

            beforeEach(function() {
                var stub = {};
                stub[methodName] = sinon.spy(function() {
                    if (arguments[0] === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve(expected(arguments));
                });
                runtime = createRuntime(stub);
                projects.init(runtime);
            });

            it("calls through", function(done) {
                projects[methodName](opts).then(function(result) {
                    result.should.eql(expected([opts.user, opts.id, opts.branch, opts.create, opts.remote, opts.path, opts.type, opts.sha, opts.message, opts.limit, opts.before, opts.track, opts.allowUnrelatedHistories]));
                    done();
                }).catch(done);
            });

            it("rejects with internal error", function(done) {
                var errorOpts = Object.assign({}, opts, {user:"error"});
                assertRejects(function() {
                    return projects[methodName](errorOpts);
                }, done);
            });
        });
    }

    describe("getProject", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                getProject: sinon.spy(function(user, id) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve({user:user,id:id});
                })
            });
            projects.init(runtime);
        });
        it("returns project", function(done) {
            projects.getProject({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.getProject({user:"error",id:123});
            }, done);
        });
    });

    describe("updateProject", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                updateProject: sinon.spy(function(user, id, project) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve({user:user,id:id,project:project});
                })
            });
            projects.init(runtime);
        });
        it("updates project", function(done) {
            projects.updateProject({user:"known",id:123,project:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,project:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.updateProject({user:"error",id:123,project:{a:1}});
            }, done);
        });
    });

    describe("deleteProject", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                deleteProject: sinon.spy(function(user, id) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve({user:user,id:id});
                })
            });
            projects.init(runtime);
        });
        it("deletes project", function(done) {
            projects.deleteProject({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            assertRejects(function() {
                return projects.deleteProject({user:"error",id:123});
            }, done);
        });
    });

    [
        {
            name: "getStatus",
            handler: "getStatus",
            opts: {user:"known",id:123,remote:{a:1}},
            expected: {user:"known",id:123,remote:{a:1}},
            impl: function(user, id, remote) { return {user:user,id:id,remote:remote}; }
        },
        {
            name: "getBranches",
            handler: "getBranches",
            opts: {user:"known",id:123,remote:{a:1}},
            expected: {user:"known",id:123,remote:{a:1}},
            impl: function(user, id, remote) { return {user:user,id:id,remote:remote}; }
        },
        {
            name: "getBranchStatus",
            handler: "getBranchStatus",
            opts: {user:"known",id:123,branch:{a:1}},
            expected: {user:"known",id:123,branch:{a:1}},
            impl: function(user, id, branch) { return {user:user,id:id,branch:branch}; }
        },
        {
            name: "setBranch",
            handler: "setBranch",
            opts: {user:"known",id:123,branch:{a:1},create:true},
            expected: {user:"known",id:123,branch:{a:1},create:true},
            impl: function(user, id, branch, create) { return {user:user,id:id,branch:branch,create:create}; }
        },
        {
            name: "deleteBranch",
            handler: "deleteBranch",
            opts: {user:"known",id:123,branch:{a:1},force:true},
            expected: {user:"known",id:123,branch:{a:1},force:true},
            impl: function(user, id, branch, isRemote, force) { return {user:user,id:id,branch:branch,force:force}; }
        },
        {
            name: "commit",
            handler: "commit",
            opts: {user:"known",id:123,message:{a:1}},
            expected: {user:"known",id:123,message:{message:{a:1}}},
            impl: function(user, id, message) { return {user:user,id:id,message:message}; }
        },
        {
            name: "getCommit",
            handler: "getCommit",
            opts: {user:"known",id:123,sha:{a:1}},
            expected: {user:"known",id:123,sha:{a:1}},
            impl: function(user, id, sha) { return {user:user,id:id,sha:sha}; }
        },
        {
            name: "getCommits",
            handler: "getCommits",
            opts: {user:"known",id:123},
            expected: {user:"known",id:123,options:{limit:20,before:undefined}},
            impl: function(user, id, options) { return {user:user,id:id,options:options}; }
        },
        {
            name: "abortMerge",
            handler: "abortMerge",
            opts: {user:"known",id:123},
            expected: {user:"known",id:123},
            impl: function(user, id) { return {user:user,id:id}; }
        },
        {
            name: "resolveMerge",
            handler: "resolveMerge",
            opts: {user:"known",id:123,path:"/abc",resolution:{a:1}},
            expected: {user:"known",id:123,path:"/abc",resolution:{a:1}},
            impl: function(user, id, path, resolution) { return {user:user,id:id,path:path,resolution:resolution}; }
        },
        {
            name: "getFiles",
            handler: "getFiles",
            opts: {user:"known",id:123},
            expected: {user:"known",id:123},
            impl: function(user, id) { return {user:user,id:id}; }
        },
        {
            name: "getFile",
            handler: "getFile",
            opts: {user:"known",id:123,path:"/abc",tree:{a:1}},
            expected: {user:"known",id:123,path:"/abc",tree:{a:1}},
            impl: function(user, id, path, tree) { return {user:user,id:id,path:path,tree:tree}; }
        },
        {
            name: "stageFile",
            handler: "stageFile",
            opts: {user:"known",id:123,path:{a:1}},
            expected: {user:"known",id:123,path:{a:1}},
            impl: function(user, id, path) { return {user:user,id:id,path:path}; }
        },
        {
            name: "unstageFile",
            handler: "unstageFile",
            opts: {user:"known",id:123,path:{a:1}},
            expected: {user:"known",id:123,path:{a:1}},
            impl: function(user, id, path) { return {user:user,id:id,path:path}; }
        },
        {
            name: "revertFile",
            handler: "revertFile",
            opts: {user:"known",id:123,path:{a:1}},
            expected: {user:"known",id:123,path:{a:1}},
            impl: function(user, id, path) { return {user:user,id:id,path:path}; }
        },
        {
            name: "getFileDiff",
            handler: "getFileDiff",
            opts: {user:"known",id:123,path:{a:1},type:"abc"},
            expected: {user:"known",id:123,path:{a:1},type:"abc"},
            impl: function(user, id, path, type) { return {user:user,id:id,path:path,type:type}; }
        },
        {
            name: "getRemotes",
            handler: "getRemotes",
            opts: {user:"known",id:123},
            expected: {user:"known",id:123},
            impl: function(user, id) { return {user:user,id:id}; }
        },
        {
            name: "addRemote",
            handler: "addRemote",
            opts: {user:"known",id:123,remote:{a:1}},
            expected: {user:"known",id:123,remote:{a:1}},
            impl: function(user, id, remote) { return {user:user,id:id,remote:remote}; }
        },
        {
            name: "removeRemote",
            handler: "removeRemote",
            opts: {user:"known",id:123,remote:{a:1}},
            expected: {user:"known",id:123,remote:{a:1}},
            impl: function(user, id, remote) { return {user:user,id:id,remote:remote}; }
        },
        {
            name: "updateRemote",
            handler: "updateRemote",
            opts: {user:"known",id:123,remote:{name:"abc",a:1}},
            expected: {user:"known",id:123,name:"abc",remote:{name:"abc",a:1}},
            impl: function(user, id, name, remote) { return {user:user,id:id,name:name,remote:remote}; }
        },
        {
            name: "pull",
            handler: "pull",
            opts: {user:"known",id:123,remote:"abc",track:false,allowUnrelatedHistories:true},
            expected: {user:"known",id:123,remote:"abc",track:false,allowUnrelatedHistories:true},
            impl: function(user, id, remote, track, allowUnrelatedHistories) {
                return {user:user,id:id,remote:remote,track:track,allowUnrelatedHistories:allowUnrelatedHistories};
            }
        },
        {
            name: "push",
            handler: "push",
            opts: {user:"known",id:123,remote:"abc",track:false},
            expected: {user:"known",id:123,remote:"abc",track:false},
            impl: function(user, id, remote, track) { return {user:user,id:id,remote:remote,track:track}; }
        }
    ].forEach(function(testCase) {
        describe(testCase.name, function() {
            var runtime;
            beforeEach(function() {
                var stub = {};
                stub[testCase.handler] = sinon.spy(function() {
                    if (arguments[0] === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve(testCase.impl.apply(null, arguments));
                });
                runtime = createRuntime(stub);
                projects.init(runtime);
            });

            it("calls through", function(done) {
                projects[testCase.handler](testCase.opts).then(function(result) {
                    result.should.eql(testCase.expected);
                    done();
                }).catch(done);
            });

            it("rejects with internal error", function(done) {
                assertRejects(function() {
                    return projects[testCase.handler](Object.assign({}, testCase.opts, {user:"error"}));
                }, done);
            });
        });
    });

    describe("getCommits", function() {
        var runtime;
        beforeEach(function() {
            runtime = createRuntime({
                getCommits: sinon.spy(function(user, id, options) {
                    if (user === "error") {
                        return rejectedError();
                    }
                    return Promise.resolve({user:user,id:id,options:options});
                })
            });
            projects.init(runtime);
        });

        it("gets commits with provided limit/before", function(done) {
            projects.getCommits({user:"known",id:123,limit:10,before:456}).then(function(result) {
                result.should.eql({user:"known",id:123,options:{limit:10,before:456}});
                done();
            }).catch(done);
        });
    });
});
