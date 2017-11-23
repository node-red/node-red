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

module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        settings = runtime.settings;
    },
    app: function() {
        var app = express();

        // Projects

        // List all projects
        app.get("/", function(req,res) {
            runtime.storage.projects.listProjects().then(function(list) {
                var active = runtime.storage.projects.getActiveProject();
                var response = {
                    active: active.name,
                    projects: list
                };
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
        app.post("/", function(req,res) {
            runtime.storage.projects.createProject(req.body).then(function(data) {
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
        app.put("/:id", function(req,res) {
            //TODO: validate the payload properly
            if (req.body.active) {
                var currentProject = runtime.storage.projects.getActiveProject();
                if (req.params.id !== currentProject.name) {
                    runtime.storage.projects.setActiveProject(req.params.id).then(function() {
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
            } else if (req.body.hasOwnProperty('credentialSecret') ||
                       req.body.hasOwnProperty('description') ||
                       req.body.hasOwnProperty('dependencies')||
                       req.body.hasOwnProperty('summary') ||
                       req.body.hasOwnProperty('files') ||
                       req.body.hasOwnProperty('remote')) {
                runtime.storage.projects.updateProject(req.params.id, req.body).then(function() {
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
        app.get("/:id", function(req,res) {
            runtime.storage.projects.getProject(req.params.id).then(function(data) {
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

        // Delete project - tbd
        app.delete("/:id", function(req,res) {
        });


        // Get project status - files, commit counts, branch info
        app.get("/:id/status", function(req,res) {
            runtime.storage.projects.getStatus(req.params.id).then(function(data) {
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


        // Project file listing
        app.get("/:id/files", function(req,res) {
            runtime.storage.projects.getFiles(req.params.id).then(function(data) {
                console.log("TODO: REMOVE /:id/files as /:id/status is better!")
                res.json(data);
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });


        // Get file content in a given tree (index/stage)
        app.get("/:id/files/:treeish/*", function(req,res) {
            var projectId = req.params.id;
            var treeish = req.params.treeish;
            var filePath = req.params[0];

            runtime.storage.projects.getFile(projectId,filePath,treeish).then(function(data) {
                res.json({content:data});
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Stage a file
        app.post("/:id/stage/*", function(req,res) {
            var projectName = req.params.id;
            var file = req.params[0];

            runtime.storage.projects.stageFile(projectName,file).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Stage multiple files
        app.post("/:id/stage", function(req,res) {
            var projectName = req.params.id;
            var files = req.body.files;

            runtime.storage.projects.stageFile(projectName,files).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Commit changes
        app.post("/:id/commit", function(req,res) {
            var projectName = req.params.id;

            runtime.storage.projects.commit(projectName,req.body).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Unstage a file
        app.delete("/:id/stage/*", function(req,res) {
            var projectName = req.params.id;
            var file = req.params[0];

            runtime.storage.projects.unstageFile(projectName,file).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Unstage multiple files
        app.delete("/:id/stage", function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.unstageFile(projectName).then(function(data) {
                res.redirect(303,req.baseUrl+"/"+projectName+"/status");
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Get a file diff
        app.get("/:id/diff/:type/*", function(req,res) {
            var projectName = req.params.id;
            var type = req.params.type;
            var file = req.params[0];
            runtime.storage.projects.getFileDiff(projectName,file,type).then(function(data) {
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
        app.get("/:id/commits", function(req, res) {
            var projectName = req.params.id;
            var options = {
                limit: req.query.limit||20,
                before: req.query.before
            };
            runtime.storage.projects.getCommits(projectName,options).then(function(data) {
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
        app.get("/:id/commits/:sha", function(req, res) {
            var projectName = req.params.id;
            var sha = req.params.sha;

            runtime.storage.projects.getCommit(projectName,sha).then(function(data) {
                res.json({commit:data});
            })
            .catch(function(err) {
                console.log(err.stack);
                res.status(400).json({error:"unexpected_error", message:err.toString()});
            })
        });

        // Push local commits to remote
        app.post("/:id/push/?*", function(req,res) {
            var projectName = req.params.id;
            var remoteBranchName = req.params[0]
            var setRemote = req.query.u;
            runtime.storage.projects.push(projectName,remoteBranchName,setRemote).then(function(data) {
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

        // Pull remote commits
        app.post("/:id/pull/?*", function(req,res) {
            var projectName = req.params.id;
            var remoteBranchName = req.params[0];
            var setRemote = req.query.u;
            runtime.storage.projects.pull(projectName,remoteBranchName,setRemote).then(function(data) {
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
        app.delete("/:id/merge", function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.abortMerge(projectName).then(function(data) {
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
        app.post("/:id/resolve/*", function(req, res) {
            var projectName = req.params.id;
            var file = req.params[0];
            var resolution = req.body.resolutions;
            runtime.storage.projects.resolveMerge(projectName,file,resolution).then(function(data) {
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
        app.get("/:id/branches", function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.getBranches(projectName,false).then(function(data) {
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

        // Get a list of remote branches
        app.get("/:id/branches/remote", function(req, res) {
            var projectName = req.params.id;
            runtime.storage.projects.getBranches(projectName,true).then(function(data) {
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

        // Get branch status - commit counts/ahead/behind
        app.get("/:id/branches/remote/*/status", function(req, res) {
            var projectName = req.params.id;
            var branch = req.params[0];
            runtime.storage.projects.getBranchStatus(projectName,branch).then(function(data) {
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
        app.post("/:id/branches", function(req, res) {
            var projectName = req.params.id;
            var branchName = req.body.name;
            var isCreate = req.body.create;
            runtime.storage.projects.setBranch(projectName,branchName,isCreate).then(function(data) {
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




        return app;
    }
}
