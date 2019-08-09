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

/**
 * @mixin @node-red/runtime_projects
 */

var runtime;

var api = module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
    },
    available: function(opts) {
        return Promise.resolve(!!runtime.storage.projects);
    },
    /**
    * List projects known to the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    listProjects: function(opts) {
        return runtime.storage.projects.listProjects(opts.user).then(function(list) {
            var active = runtime.storage.projects.getActiveProject(opts.user);
            var response = {
                projects: list
            };
            if (active) {
                response.active = active.name;
            }
            return response;
        }).catch(function(err) {
            err.status = 400;
            throw err;
        })
    },

    /**
    * Create a new project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.project - the project information
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    createProject: function(opts) {
        runtime.log.audit({event: "projects.create",name:opts.project?opts.project.name:"missing-name"}, opts.req);
        return runtime.storage.projects.createProject(opts.user, opts.project)
    },

    /**
    * Initialises an empty project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project to initialise
    * @param {Object} opts.project - the project information
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    initialiseProject: function(opts) {
        // Initialised set when creating default files for an empty repo
        runtime.log.audit({event: "projects.initialise",id:opts.id}, opts.req);
        return runtime.storage.projects.initialiseProject(opts.user, opts.id, opts.project)
    },

    /**
    * Gets the active project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the active project
    * @memberof @node-red/runtime_projects
    */
    getActiveProject: function(opts) {
        return Promise.resolve(runtime.storage.projects.getActiveProject(opts.user));
    },

    /**
    *
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project to activate
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    setActiveProject: function(opts) {
        var currentProject = runtime.storage.projects.getActiveProject(opts.user);
        runtime.log.audit({event: "projects.set",id:opts.id}, opts.req);
        if (!currentProject || opts.id !== currentProject.name) {
            return runtime.storage.projects.setActiveProject(opts.user, opts.id);
        } else {
            return Promise.resolve();
        }
    },

    /**
    * Gets a projects metadata
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project to get
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the project metadata
    * @memberof @node-red/runtime_projects
    */
    getProject: function(opts) {
        return runtime.storage.projects.getProject(opts.user, opts.id)
    },

    /**
    * Updates the metadata of an existing project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project to update
    * @param {Object} opts.project - the project information
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    updateProject: function(opts) {
        runtime.log.audit({event: "projects.update",id:opts.id}, opts.req);
        return runtime.storage.projects.updateProject(opts.user, opts.id, opts.project);
    },

    /**
    * Deletes a project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project to update
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    deleteProject: function(opts) {
        runtime.log.audit({event: "projects.delete",id:opts.id}, opts.req);
        return runtime.storage.projects.deleteProject(opts.user, opts.id);
    },

    /**
    * Gets current git status of a project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Boolean} opts.remote - whether to include status of remote repos
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the project status
    * @memberof @node-red/runtime_projects
    */
    getStatus: function(opts) {
        return runtime.storage.projects.getStatus(opts.user, opts.id, opts.remote)
    },

    /**
    * Get a list of local branches
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Boolean} opts.remote - whether to return remote branches (true) or local (false)
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - a list of the local branches
    * @memberof @node-red/runtime_projects
    */
    getBranches: function(opts) {
        return runtime.storage.projects.getBranches(opts.user, opts.id, opts.remote);
    },

    /**
    * Gets the status of a branch
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.branch - the name of the branch
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the status of the branch
    * @memberof @node-red/runtime_projects
    */
    getBranchStatus: function(opts) {
        return runtime.storage.projects.getBranchStatus(opts.user, opts.id, opts.branch);
    },

    /**
    * Sets the current local branch
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.branch - the name of the branch
    * @param {Boolean} opts.create - whether to create the branch if it doesn't exist
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    setBranch: function(opts) {
        runtime.log.audit({event: "projects.branch.set",id:opts.id, branch: opts.branch, create:opts.create}, opts.req);
        return runtime.storage.projects.setBranch(opts.user, opts.id, opts.branch, opts.create)
    },

    /**
    * Deletes a branch
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.branch - the name of the branch
    * @param {Boolean} opts.force - whether to force delete
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    deleteBranch: function(opts) {
        runtime.log.audit({event: "projects.branch.delete",id:opts.id, branch: opts.branch, force:opts.force}, opts.req);
        return runtime.storage.projects.deleteBranch(opts.user, opts.id, opts.branch, false, opts.force);
    },

    /**
    * Commits the current staged files
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.message - the message to associate with the commit
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    commit: function(opts) {
        runtime.log.audit({event: "projects.commit",id:opts.id}, opts.req);
        return runtime.storage.projects.commit(opts.user, opts.id,{message: opts.message});
    },

    /**
    * Gets the details of a single commit
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.sha - the sha of the commit to return
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the commit details
    * @memberof @node-red/runtime_projects
    */
    getCommit: function(opts) {
        return runtime.storage.projects.getCommit(opts.user, opts.id, opts.sha);
    },

    /**
    * Gets the commit history of the project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.limit - limit how many to return
    * @param {String} opts.before - id of the commit to work back from
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Array>} - an array of commits
    * @memberof @node-red/runtime_projects
    */
    getCommits: function(opts) {
        return runtime.storage.projects.getCommits(opts.user, opts.id, {
            limit: opts.limit || 20,
            before: opts.before
        });
    },

    /**
    * Abort an in-progress merge
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    abortMerge: function(opts) {
        runtime.log.audit({event: "projects.merge.abort",id:opts.id}, opts.req);
        return runtime.storage.projects.abortMerge(opts.user, opts.id);
    },

    /**
    * Resolves a merge conflict
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.path - the path of the file being merged
    * @param {String} opts.resolutions - how to resolve the merge conflict
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    resolveMerge: function(opts) {
        runtime.log.audit({event: "projects.merge.resolve",id:opts.id, file:opts.path}, opts.req);
        return runtime.storage.projects.resolveMerge(opts.user, opts.id, opts.path, opts.resolution);
    },

    /**
    * Gets a listing of the files in the project
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the file listing
    * @memberof @node-red/runtime_projects
    */
    getFiles: function(opts) {
        return runtime.storage.projects.getFiles(opts.user, opts.id);
    },

    /**
    * Gets the contents of a file
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.path - the path of the file
    * @param {String} opts.tree - the version control tree to use
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<String>} - the content of the file
    * @memberof @node-red/runtime_projects
    */
    getFile: function(opts) {
        return runtime.storage.projects.getFile(opts.user, opts.id,opts.path,opts.tree);
    },

    /**
    *
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String|Array} opts.path - the path of the file, or an array of paths
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    stageFile: function(opts) {
        runtime.log.audit({event: "projects.file.stage",id:opts.id, file:opts.path}, opts.req);
        return runtime.storage.projects.stageFile(opts.user, opts.id, opts.path);
    },

    /**
    *
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.path - the path of the file. If not set, all staged files are unstaged
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    unstageFile: function(opts) {
        runtime.log.audit({event: "projects.file.unstage",id:opts.id, file:opts.path}, opts.req);
        return runtime.storage.projects.unstageFile(opts.user, opts.id, opts.path);
    },

    /**
    * Reverts changes to a file back to its commited version
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.path - the path of the file
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    revertFile: function(opts) {
        runtime.log.audit({event: "projects.file.revert",id:opts.id, file:opts.path}, opts.req);
        return runtime.storage.projects.revertFile(opts.user, opts.id,opts.path)
    },

    /**
    * Get the diff of a file
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.path - the path of the file
    * @param {String} opts.type - the type of diff
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the requested diff
    * @memberof @node-red/runtime_projects
    */
    getFileDiff: function(opts) {
        return runtime.storage.projects.getFileDiff(opts.user, opts.id, opts.path, opts.type);
    },

    /**
    * Gets a list of the project remotes
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - a list of project remotes
    * @memberof @node-red/runtime_projects
    */
    getRemotes: function(opts) {
        return runtime.storage.projects.getRemotes(opts.user, opts.id);

    },

    /**
    *
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Object} opts.remote - the remote metadata
    * @param {String} opts.remote.name - the name of the remote
    * @param {String} opts.remote.url - the url of the remote
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    addRemote: function(opts) {
        runtime.log.audit({event: "projects.remote.add",id:opts.id, remote:opts.remote.name}, opts.req);
        return runtime.storage.projects.addRemote(opts.user, opts.id, opts.remote)
    },

    /**
    * Remove a project remote
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.remote - the name of the remote
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    removeRemote: function(opts) {
        runtime.log.audit({event: "projects.remote.delete",id:opts.id, remote:opts.remote}, opts.req);
        return runtime.storage.projects.removeRemote(opts.user, opts.id, opts.remote);
    },

    /**
    *
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {Object} opts.remote - the remote metadata
    * @param {String} opts.remote.name - the name of the remote
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    updateRemote: function(opts) {
        runtime.log.audit({event: "projects.remote.update",id:opts.id, remote:opts.remote.name}, opts.req);
        return runtime.storage.projects.updateRemote(opts.user, opts.id, opts.remote.name, opts.remote)
    },

    /**
    * Pull changes from the remote
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.remote - the remote to pull
    * @param {Boolean} opts.track - whether to track this remote
    * @param {Boolean} opts.allowUnrelatedHistories -
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    pull: function(opts) {
        runtime.log.audit({event: "projects.pull",id:opts.id, remote: opts.remote, track:opts.track}, opts.req);
        return runtime.storage.projects.pull(opts.user, opts.id, opts.remote, opts.track, opts.allowUnrelatedHistories);
    },

    /**
    * Push changes to a remote
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the project
    * @param {String} opts.remote - the name of the remote
    * @param {String} opts.track - whether to set the remote as the upstream
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_projects
    */
    push: function(opts) {
        runtime.log.audit({event: "projects.push",id:opts.id, remote: opts.remote, track:opts.track}, opts.req);
        return runtime.storage.projects.push(opts.user, opts.id, opts.remote, opts.track);
    }

}
