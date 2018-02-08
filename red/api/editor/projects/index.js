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

var express = require("express");
var runtime;
var settings;
var needsPermission = require("../../auth").needsPermission;

module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        settings = runtime.settings;
    },
    app: function() {
        var app = express();

        app.use(function(req,res,next) {
            if (!runtime.storage.projects) {
                res.status(404).end();
            } else {
                next();
            }
        });

        // Projects

        // List all projects
        app.get("/", needsPermission("projects.read"), function(req,res) {
            runtime.storage.projects.listProjects(req.user, req.user).then(function(list) {
                var active = runtime.storage.projects.getActiveProject(req.user);
                var response = {
                    projects: list
                };
                if (active) {
                    response.active = active.name;
                }
                res.json(response);
            }).catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Create project
        app.post("/", needsPermission("projects.write"), function(req,res) {
            runtime.storage.projects.createProject(req.user, req.body).then(function(data) {
                res.json(data);
            }).catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Update a project
        app.put("/:id", needsPermission("projects.write"), function(req,res) {
            //TODO: validate the payload properly
            if (req.body.active) {
                var currentProject = runtime.storage.projects.getActiveProject(req.user);
                if (!currentProject || req.params.id !== currentProject.name) {
                    runtime.storage.projects.setActiveProject(req.user, req.params.id).then(function() {
                        res.redirect(303,req.baseUrl + '/');
                    }).catch(function(err) {
                        if (err.code) {
                            res.status(400).json({error:err.code, message: err.message});
                        } else {
                            res.status(400).json({error:"unexpected_error", message:err.toString()});
                        }
                    })
                } else {
                    res.redirect(303,req.baseUrl + '/'+ req.params.id);
                }
            } else if (req.body.initialise) {
                // Initialised set when creating default files for an empty repo
                runtime.storage.projects.initialiseProject(req.user, req.params.id, req.body).then(function() {
                    res.redirect(303,req.baseUrl + '/'+ req.params.id);
                }).catch(function(err) {
                    if (err.code) {
                        res.status(400).json({error:err.code, message: err.message});
                    } else {
                        res.status(400).json({error:"unexpected_error", message:err.toString()});
                    }
                })
            } else if (req.body.hasOwnProperty('credentialSecret') ||
                       req.body.hasOwnProperty('description') ||
                       req.body.hasOwnProperty('dependencies')||
                       req.body.hasOwnProperty('summary') ||
                       req.body.hasOwnProperty('files') ||
                        req.body.hasOwnProperty('git')) {
                runtime.storage.projects.updateProject(req.user, req.params.id, req.body).then(function() {
                    res.redirect(303,req.baseUrl + '/'+ req.params.id);
                }).catch(function(err) {
                    if (err.code) {
                        res.status(400).json({error:err.code, message: err.message});
                    } else {
                        res.status(400).json({error:"unexpected_error", message:err.toString()});
                    }
                })
            } else {
                res.status(400).json({error:"unexpected_error", message:"invalid_request"});
            }
        });

        // Get project metadata
        app.get("/:id", needsPermission("projects.read"), function(req,res) {
            runtime.storage.projects.getProject(req.user, req.params.id).then(function(data) {
                if (data) {
                    res.json(data);
                } else {
                    res.status(404).end();
                }
            }).catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Delete project
        app.delete("/:id", needsPermission("projects.write"), function(req,res) {
            runtime.storage.projects.deleteProject(req.user, req.params.id).then(function() {
                res.status(204).end();
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()})
            });
        });


        // Get project status - files, commit counts, branch info
        app.get("/:id/status", needsPermission("projects.read"), function(req,res) {
            var includeRemote = req.query.remote;

            runtime.storage.projects.getStatus(req.user, req.params.id, includeRemote).then(function(data) {
                if (data) {
                    res.json(data);
                } else {
                    res.status(404).end();
                }
            }).catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });


        // Project file listing
        app.get("/:id/files", needsPermission("projects.read"), function(req,res) {
            runtime.storage.projects.getFiles(req.user, req.params.id).then(function(data) {
                // console.log("TODO: REMOVE /:id/files as /:id/status is better!")
                res.json(data);
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });


        // Get file content in a given tree (index/stage)
        app.get("/:id/files/:treeish/*", needsPermission("projects.read"), function(req,res) {
            var projectId = req.params.id;
            var treeish = req.params.treeish;
            var filePath = req.params[0];

            runtime.storage.projects.getFile(req.user, projectId,filePath,treeish).then(function(data) {
                res.json({content:data});
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Revert a file
        app.delete("/:id/files/_/*", needsPermission("projects.write"), function(req,res) {
            var projectId = req.params.id;
            var filePath = req.params[0];

            runtime.storage.projects.revertFile(req.user, projectId,filePath).then(function() {
                res.status(204).end();
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });



        // Stage a file
        app.post("/:id/stage/*", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            var file = req.params[0];

            runtime.storage.projects.stageFile(req.user, projectName,file).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Stage multiple files
        app.post("/:id/stage", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            var files = req.body.files;

            runtime.storage.projects.stageFile(req.user, projectName,files).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Commit changes
        app.post("/:id/commit", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;

            runtime.storage.projects.commit(req.user, projectName,req.body).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Unstage a file
        app.delete("/:id/stage/*", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            var file = req.params[0];

            runtime.storage.projects.unstageFile(req.user, projectName,file).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Unstage multiple files
        app.delete("/:id/stage", needsPermission("projects.write"), function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.unstageFile(req.user, projectName).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Get a file diff
        app.get("/:id/diff/:type/*", needsPermission("projects.read"), function(req,res) {
            var projectName = req.params.id;
            var type = req.params.type;
            var file = req.params[0];
            runtime.storage.projects.getFileDiff(req.user, projectName,file,type).then(function(data) {
                res.json({
                    diff: data
                })
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Get a list of commits
        app.get("/:id/commits", needsPermission("projects.read"), function(req, res) {
            var projectName = req.params.id;
            var options = {
                limit: req.query.limit||20,
                before: req.query.before
            };
            runtime.storage.projects.getCommits(req.user, projectName,options).then(function(data) {
                res.json(data);
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Get an individual commit details
        app.get("/:id/commits/:sha", needsPermission("projects.read"), function(req, res) {
            var projectName = req.params.id;
            var sha = req.params.sha;

            runtime.storage.projects.getCommit(req.user, projectName,sha).then(function(data) {
                res.json({commit:data});
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Push local commits to remote
        app.post("/:id/push/?*", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            var remoteBranchName = req.params[0]
            var setRemote = req.query.u;
            runtime.storage.projects.push(req.user, projectName,remoteBranchName,setRemote).then(function(data) {
                res.status(204).end();
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Pull remote commits
        app.post("/:id/pull/?*", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            var remoteBranchName = req.params[0];
            var setUpstream = req.query.setUpstream;
            var allowUnrelatedHistories = req.query.allowUnrelatedHistories;
            runtime.storage.projects.pull(req.user, projectName,remoteBranchName,setUpstream,allowUnrelatedHistories).then(function(data) {
                res.status(204).end();
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Abort an ongoing merge
        app.delete("/:id/merge", needsPermission("projects.write"), function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.abortMerge(req.user, projectName).then(function(data) {
                res.status(204).end();
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Resolve a merge
        app.post("/:id/resolve/*", needsPermission("projects.write"), function(req, res) {
            var projectName = req.params.id;
            var file = req.params[0];
            var resolution = req.body.resolutions;
            runtime.storage.projects.resolveMerge(req.user, projectName,file,resolution).then(function(data) {
                res.status(204).end();
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Get a list of local branches
        app.get("/:id/branches", needsPermission("projects.read"), function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.getBranches(req.user, projectName,false).then(function(data) {
                res.json(data);
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Delete a local branch - ?force=true
        app.delete("/:id/branches/:branchName", needsPermission("projects.write"), function(req, res) {
            var projectName = req.params.id;
            var branchName = req.params.branchName;
            var force = !!req.query.force;
            runtime.storage.projects.deleteBranch(req.user, projectName, branchName, false, force).then(function(data) {
                res.status(204).end();
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            });
        });

        // Get a list of remote branches
        app.get("/:id/branches/remote", needsPermission("projects.read"), function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.getBranches(req.user, projectName,true).then(function(data) {
                res.json(data);
            })
            .catch(function(err) {
                console.log(err);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message, remote: err.remote});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Get branch status - commit counts/ahead/behind
        app.get("/:id/branches/remote/*/status", needsPermission("projects.read"), function(req, res) {
            var projectName = req.params.id;
            var branch = req.params[0];
            runtime.storage.projects.getBranchStatus(req.user, projectName,branch).then(function(data) {
                res.json(data);
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Set the active local branch
        app.post("/:id/branches", needsPermission("projects.write"), function(req, res) {
            var projectName = req.params.id;
            var branchName = req.body.name;
            var isCreate = req.body.create;
            runtime.storage.projects.setBranch(req.user, projectName,branchName,isCreate).then(function(data) {
                res.json(data);
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Get a list of remotes
        app.get("/:id/remotes", needsPermission("projects.read"), function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.getRemotes(req.user, projectName).then(function(data) {
                res.json(data);
            })
            .catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Add a remote
        app.post("/:id/remotes", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            if (/^https?:\/\/[^/]+@/i.test(req.body.url)) {
                res.status(400).json({error:"unexpected_error", message:"Git http url must not include username/password"});
                return;
            }
            runtime.storage.projects.addRemote(req.user, projectName, req.body).then(function() {
                res.redirect(303,req.baseUrl+"/"+projectName+"/remotes");
            }).catch(function(err) {
                console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            })
        });

        // Delete a remote
        app.delete("/:id/remotes/:remoteName", needsPermission("projects.write"), function(req, res) {
            var projectName = req.params.id;
            var remoteName = req.params.remoteName;
            runtime.storage.projects.removeRemote(req.user, projectName, remoteName).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/remotes");
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            });
        });

        // Update a remote
        app.put("/:id/remotes/:remoteName", needsPermission("projects.write"), function(req,res) {
            var projectName = req.params.id;
            var remoteName = req.params.remoteName;
            runtime.storage.projects.updateRemote(req.user, projectName, remoteName, req.body).then(function(data) {
                res.status(204).end();
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            });

        });

        return app;
    }
}
