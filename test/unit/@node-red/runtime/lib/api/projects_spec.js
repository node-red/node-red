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
var projects = NR_TEST_UTILS.require("@node-red/runtime/lib/api/projects")

var mockLog = () => ({
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
})

describe("runtime-api/settings", function() {
    describe("available", function() {
        it("resolves true if projects available", function(done) {
            projects.init({
                storage: {
                    projects: {}
                }
            });
            projects.available().then(function(result) {
                result.should.be.true();
                done();
            }).catch(done);
        })
        it("resolves false if projects unavailable", function(done) {
            projects.init({
                storage: {
                }
            });
            projects.available().then(function(result) {
                result.should.be.false();
                done();
            }).catch(done);
        })

    });
    describe("listProjects", function() {
        var runtime = {
            log: mockLog(),
            storage: {projects: {
            listProjects: sinon.spy(function(user) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve([1,2,3]);
                }
            }),
            getActiveProject: function(user) {
                if (user === "noActive") {
                    return null;
                }
                return {name:"aProject"};
            }
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("lists the projects, without an active project", function(done) {
            projects.listProjects({user:"noActive"}).then(function(result) {
                result.should.have.property('projects',[1,2,3]);
                result.should.not.have.property('active');
                done();
            }).catch(done);
        });
        it("lists the projects, with an active project", function(done) {
            projects.listProjects({user:"foo"}).then(function(result) {
                result.should.have.property('projects',[1,2,3]);
                result.should.have.property('active','aProject');
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.listProjects({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                err.should.have.property('status',400);
                done();
            }).catch(done);
        });

    });
    describe("createProject", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            createProject: sinon.spy(function(user,project) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve(project);
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("create project", function(done) {
            projects.createProject({user:"known",project:{a:1}}).then(function(result) {
                result.should.eql({a:1});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.createProject({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("initialiseProject", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            initialiseProject: sinon.spy(function(user,id,project) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({id,project});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("intialise project", function(done) {
            projects.initialiseProject({user:"known",id:123, project:{a:1}}).then(function(result) {
                result.should.eql({id:123, project:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.initialiseProject({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getActiveProject", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getActiveProject: sinon.spy(function(user) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve("123");
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("returns active project", function(done) {
            projects.getActiveProject({user:"known"}).then(function(result) {
                result.should.eql("123");
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getActiveProject({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("setActiveProject", function() {
        var activeProject;
        var runtime;
        beforeEach(function() {
            runtime = {
        log: mockLog(),
        storage: {projects: {
                getActiveProject: sinon.spy(function() { return activeProject;}),
                setActiveProject: sinon.spy(function(user,id) {
                    if (user === "error") {
                        var err = new Error("error");
                        err.code = "error";
                        var p = Promise.reject(err);
                        p.catch(()=>{});
                        return p;
                    } else {
                        return Promise.resolve({user,id});
                    }
                })
            }}};
            projects.init(runtime);
        })
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
                (result === undefined).should.be.true();
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.setActiveProject({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getProject", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getProject: sinon.spy(function(user,id) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("returns project", function(done) {
            projects.getProject({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getProject({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("updateProject", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            updateProject: sinon.spy(function(user,id,project) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,project});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("updates project", function(done) {
            projects.updateProject({user:"known",id:123,project:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,project:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.updateProject({user:"error",id:123,project:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("deleteProject", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            deleteProject: sinon.spy(function(user,id) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("deletes project", function(done) {
            projects.deleteProject({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.deleteProject({user:"error",id:123}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getStatus", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getStatus: sinon.spy(function(user,id,remote) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,remote});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets status", function(done) {
            projects.getStatus({user:"known",id:123,remote:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,remote:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getStatus({user:"error",id:123,project:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("getBranches", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getBranches: sinon.spy(function(user,id,remote) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,remote});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets branches", function(done) {
            projects.getBranches({user:"known",id:123,remote:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,remote:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getBranches({user:"error",id:123,remote:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("getBranchStatus", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getBranchStatus: sinon.spy(function(user,id,branch) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,branch});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets branch status", function(done) {
            projects.getBranchStatus({user:"known",id:123,branch:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,branch:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getBranchStatus({user:"error",id:123,branch:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("setBranch", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            setBranch: sinon.spy(function(user,id,branch,create) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,branch,create});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("commits", function(done) {
            projects.setBranch({user:"known",id:123,branch:{a:1},create:true}).then(function(result) {
                result.should.eql({user:"known",id:123,branch:{a:1},create:true});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.setBranch({user:"error",id:123,branch:{a:1},create:true}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("deleteBranch", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            deleteBranch: sinon.spy(function(user,id,branch,something,force) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,branch,force});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("commits", function(done) {
            projects.deleteBranch({user:"known",id:123,branch:{a:1},force:true}).then(function(result) {
                result.should.eql({user:"known",id:123,branch:{a:1},force:true});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.deleteBranch({user:"error",id:123,branch:{a:1},force:true}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("commit", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            commit: sinon.spy(function(user,id,message) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,message});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("commits", function(done) {
            projects.commit({user:"known",id:123,message:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,message:{message:{a:1}}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.commit({user:"error",id:123,message:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("getCommit", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getCommit: sinon.spy(function(user,id,sha) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,sha});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets commit", function(done) {
            projects.getCommit({user:"known",id:123,sha:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,sha:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getCommit({user:"error",id:123,sha:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getCommits", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getCommits: sinon.spy(function(user,id,options) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,options});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets commits with default limit/before", function(done) {
            projects.getCommits({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123,options:{limit:20,before:undefined}});
                done();
            }).catch(done);
        });
        it("gets commits with provided limit/before", function(done) {
            projects.getCommits({user:"known",id:123,limit:10,before:456}).then(function(result) {
                result.should.eql({user:"known",id:123,options:{limit:10,before:456}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getCommits({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("abortMerge", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            abortMerge: sinon.spy(function(user,id) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("aborts merge", function(done) {
            projects.abortMerge({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.abortMerge({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("resolveMerge", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            resolveMerge: sinon.spy(function(user,id,path,resolution) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,path,resolution});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("resolves merge", function(done) {
            projects.resolveMerge({user:"known",id:123,path:"/abc",resolution:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,path:"/abc",resolution:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.resolveMerge({user:"error",id:123,path:"/abc",resolution:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getFiles", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getFiles: sinon.spy(function(user,id) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets files", function(done) {
            projects.getFiles({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getFiles({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getFile", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getFile: sinon.spy(function(user,id,path,tree) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,path,tree});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets file", function(done) {
            projects.getFile({user:"known",id:123,path:"/abc",tree:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,path:"/abc",tree:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getFile({user:"error",id:123,path:"/abc",tree:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("stageFile", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            stageFile: sinon.spy(function(user,id,path) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,path});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("stages a file", function(done) {
            projects.stageFile({user:"known",id:123,path:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,path:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.stageFile({user:"error",id:123,path:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("unstageFile", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            unstageFile: sinon.spy(function(user,id,path) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,path});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("unstages a file", function(done) {
            projects.unstageFile({user:"known",id:123,path:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,path:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.unstageFile({user:"error",id:123,path:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("revertFile", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            revertFile: sinon.spy(function(user,id,path) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,path});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("reverts a file", function(done) {
            projects.revertFile({user:"known",id:123,path:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,path:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.revertFile({user:"error",id:123,path:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getFileDiff", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getFileDiff: sinon.spy(function(user,id,path,type) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,path,type});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets file diff", function(done) {
            projects.getFileDiff({user:"known",id:123,path:{a:1},type:"abc"}).then(function(result) {
                result.should.eql({user:"known",id:123,path:{a:1},type:"abc"});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getFileDiff({user:"error",id:123,path:{a:1},type:"abc"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("getRemotes", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            getRemotes: sinon.spy(function(user,id) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("gets remotes", function(done) {
            projects.getRemotes({user:"known",id:123}).then(function(result) {
                result.should.eql({user:"known",id:123});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.getRemotes({user:"error"}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("addRemote", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            addRemote: sinon.spy(function(user,id,remote) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,remote});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("adds a remote", function(done) {
            projects.addRemote({user:"known",id:123,remote:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,remote:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.addRemote({user:"error",id:123,remote:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("removeRemote", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            removeRemote: sinon.spy(function(user,id,remote) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,remote});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("removes a remote", function(done) {
            projects.removeRemote({user:"known",id:123,remote:{a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,remote:{a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.removeRemote({user:"error",id:123,remote:{a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });

    describe("updateRemote", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            updateRemote: sinon.spy(function(user,id,name,remote) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,name,remote});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("updates a remote", function(done) {
            projects.updateRemote({user:"known",id:123,remote:{name:"abc",a:1}}).then(function(result) {
                result.should.eql({user:"known",id:123,name:"abc",remote:{name:"abc",a:1}});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.updateRemote({user:"error",id:123,remote:{name:"abc",a:1}}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("pull", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            pull: sinon.spy(function(user,id,remote,track,allowUnrelatedHistories) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,remote,track,allowUnrelatedHistories});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("pulls", function(done) {
            projects.pull({user:"known",id:123,remote:"abc",track:false,allowUnrelatedHistories:true}).then(function(result) {
                result.should.eql({user:"known",id:123,remote:"abc",track:false,allowUnrelatedHistories:true});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.pull({user:"error",id:123,remote:"abc",track:false,allowUnrelatedHistories:true}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });
    describe("push", function() {
        var runtime = {
        log: mockLog(),
        storage: {projects: {
            push: sinon.spy(function(user,id,remote,track) {
                if (user === "error") {
                    var err = new Error("error");
                    err.code = "error";
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                } else {
                    return Promise.resolve({user,id,remote,track});
                }
            })
        }}};
        before(function() {
            projects.init(runtime);
        })
        it("pulls", function(done) {
            projects.push({user:"known",id:123,remote:"abc",track:false}).then(function(result) {
                result.should.eql({user:"known",id:123,remote:"abc",track:false});
                done();
            }).catch(done);
        });
        it("rejects with internal error", function(done) {
            projects.push({user:"error",id:123,remote:"abc",track:false}).then(function(result) {
                done(new Error("Did not reject internal error"));
            }).catch(function(err) {
                err.should.have.property('code','error');
                // err.should.have.property('status',400);
                done();
            }).catch(done);
        });
    });


});
