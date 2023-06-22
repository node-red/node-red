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

var apiUtils = require("../util");

var settings;
var runtimeAPI;
var needsPermission = require("../auth").needsPermission;

function listProjects(req,res) {
    var opts = {
        user: req.user,
        req: apiUtils.getRequestLogObject(req)
    }
    runtimeAPI.projects.listProjects(opts).then(function(result) {
        res.json(result);
    }).catch(function(err) {
        apiUtils.rejectHandler(req,res,err);
    });
}
function getProject(req,res) {
    var opts = {
        user: req.user,
        id: req.params.id,
        req: apiUtils.getRequestLogObject(req)
    }
    runtimeAPI.projects.getProject(opts).then(function(data) {
        if (data) {
            res.json(data);
        } else {
            res.status(404).end();
        }
    }).catch(function(err) {
        apiUtils.rejectHandler(req,res,err);
    })
}
function getProjectStatus(req,res) {
    var opts = {
        user: req.user,
        id: req.params.id,
        remote: req.query.remote,
        req: apiUtils.getRequestLogObject(req)
    }
    runtimeAPI.projects.getStatus(opts).then(function(data){
        if (data) {
            res.json(data);
        } else {
            res.status(404).end();
        }
    }).catch(function(err) {
        apiUtils.rejectHandler(req,res,err);
    })
}
function getProjectRemotes(req,res) {
    var opts = {
        user: req.user,
        id: req.params.id,
        req: apiUtils.getRequestLogObject(req)
    }
    runtimeAPI.projects.getRemotes(opts).then(function(data) {
        res.json(data);
    }).catch(function(err) {
        apiUtils.rejectHandler(req,res,err);
    })
}
module.exports = {
    init: function(_settings, _runtimeAPI) {
        settings = _settings;
        runtimeAPI = _runtimeAPI;
    },
    app: function() {
        var app = apiUtils.createExpressApp(settings)

        app.use(function(req,res,next) {
            runtimeAPI.projects.available().then(function(available) {
                if (!available) {
                    res.status(404).end();
                } else {
                    next();
                }
            })
        });

        // Projects

        // List all projects
        app.get("/", needsPermission("projects.read"),listProjects);

        // Create project
        app.post("/", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                project: req.body,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.createProject(opts).then(function(result) {
                res.json(result);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            });
        });

        // Update a project
        app.put("/:id", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                project: req.body,
                req: apiUtils.getRequestLogObject(req)
            }

            if (req.body.active) {
                opts.clearContext = req.body.hasOwnProperty('clearContext')?req.body.clearContext:true
                runtimeAPI.projects.setActiveProject(opts).then(function() {
                    listProjects(req,res);
                }).catch(function(err) {
                    apiUtils.rejectHandler(req,res,err);
                })
            } else if (req.body.initialise) {
                runtimeAPI.projects.initialiseProject(opts).then(function() {
                    getProject(req,res);
                }).catch(function(err) {
                    apiUtils.rejectHandler(req,res,err);
                })
            } else if (req.body.hasOwnProperty('credentialSecret') ||
                       req.body.hasOwnProperty('description') ||
                       req.body.hasOwnProperty('dependencies')||
                       req.body.hasOwnProperty('summary') ||
                       req.body.hasOwnProperty('version') ||
                       req.body.hasOwnProperty('files') ||
                        req.body.hasOwnProperty('git')) {
                runtimeAPI.projects.updateProject(opts).then(function() {
                    getProject(req,res);
                }).catch(function(err) {
                    apiUtils.rejectHandler(req,res,err);
                })
            } else {
                res.status(400).json({error:"unexpected_error", message:"invalid_request"});
            }
        });

        // Get project metadata
        app.get("/:id", needsPermission("projects.read"), getProject);

        // Delete project
        app.delete("/:id", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.deleteProject(opts).then(function() {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });


        // Get project status - files, commit counts, branch info
        app.get("/:id/status", needsPermission("projects.read"), getProjectStatus);


        // Project file listing
        app.get("/:id/files", needsPermission("projects.read"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getFiles(opts).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })

        });


        // Get file content in a given tree (index/stage)
        app.get("/:id/files/:treeish/*", needsPermission("projects.read"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.params[0],
                tree: req.params.treeish,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getFile(opts).then(function(data) {
                res.json({content:data});
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Revert a file
        app.delete("/:id/files/_/*", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.params[0],
                req: apiUtils.getRequestLogObject(req)
            }

            runtimeAPI.projects.revertFile(opts).then(function() {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Stage a file
        app.post("/:id/stage/*", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.params[0],
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.stageFile(opts).then(function() {
                getProjectStatus(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Stage multiple files
        app.post("/:id/stage", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.body.files,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.stageFile(opts).then(function() {
                getProjectStatus(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Commit changes
        app.post("/:id/commit", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                message: req.body.message,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.commit(opts).then(function() {
                getProjectStatus(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Unstage a file
        app.delete("/:id/stage/*", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.params[0],
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.unstageFile(opts).then(function() {
                getProjectStatus(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Unstage multiple files
        app.delete("/:id/stage", needsPermission("projects.write"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.unstageFile(opts).then(function() {
                getProjectStatus(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get a file diff
        app.get("/:id/diff/:type/*", needsPermission("projects.read"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.params[0],
                type: req.params.type,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getFileDiff(opts).then(function(data) {
                res.json({
                    diff: data
                })
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get a list of commits
        app.get("/:id/commits", needsPermission("projects.read"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                limit: req.query.limit || 20,
                before: req.query.before,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getCommits(opts).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get an individual commit details
        app.get("/:id/commits/:sha", needsPermission("projects.read"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                sha: req.params.sha,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getCommit(opts).then(function(data) {
                res.json({commit:data});
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Push local commits to remote
        app.post("/:id/push/?*", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: req.params[0],
                track: req.query.u,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.push(opts).then(function(data) {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Pull remote commits
        app.post("/:id/pull/?*", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: req.params[0],
                track: req.query.setUpstream,
                allowUnrelatedHistories: req.query.allowUnrelatedHistories,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.pull(opts).then(function(data) {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Abort an ongoing merge
        app.delete("/:id/merge", needsPermission("projects.write"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.abortMerge(opts).then(function() {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Resolve a merge
        app.post("/:id/resolve/*", needsPermission("projects.write"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                path: req.params[0],
                resolution: req.body.resolutions,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.resolveMerge(opts).then(function() {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get a list of local branches
        app.get("/:id/branches", needsPermission("projects.read"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: false,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getBranches(opts).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Delete a local branch - ?force=true
        app.delete("/:id/branches/:branchName", needsPermission("projects.write"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                branch: req.params.branchName,
                force: !!req.query.force,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.deleteBranch(opts).then(function(data) {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get a list of remote branches
        app.get("/:id/branches/remote", needsPermission("projects.read"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: true,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getBranches(opts).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get branch status - commit counts/ahead/behind
        app.get("/:id/branches/remote/*/status", needsPermission("projects.read"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                branch: req.params[0],
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.getBranchStatus(opts).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Set the active local branch
        app.post("/:id/branches", needsPermission("projects.write"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                branch: req.body.name,
                create: req.body.create,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.setBranch(opts).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Get a list of remotes
        app.get("/:id/remotes", needsPermission("projects.read"), getProjectRemotes);

        // Add a remote
        app.post("/:id/remotes", needsPermission("projects.write"), function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: req.body,
                req: apiUtils.getRequestLogObject(req)
            }
            if (/^https?:\/\/[^/]+@/i.test(req.body.url)) {
                res.status(400).json({error:"unexpected_error", message:"Git http url must not include username/password"});
                return;
            }
            runtimeAPI.projects.addRemote(opts).then(function(data) {
                getProjectRemotes(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Delete a remote
        app.delete("/:id/remotes/:remoteName", needsPermission("projects.write"), function(req, res) {
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: req.params.remoteName,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.removeRemote(opts).then(function(data) {
                getProjectRemotes(req,res);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        // Update a remote
        app.put("/:id/remotes/:remoteName", needsPermission("projects.write"), function(req,res) {
            var remote = req.body || {};
            remote.name = req.params.remoteName;
            var opts = {
                user: req.user,
                id: req.params.id,
                remote: remote,
                req: apiUtils.getRequestLogObject(req)
            }
            runtimeAPI.projects.updateRemote(opts).then(function() {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        });

        return app;
    }
}
