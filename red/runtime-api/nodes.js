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
"use strict"
/**
 * @namespace RED.nodes
 */

var runtime;

var api = module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
    },


    /**
    * Gets the info of an individual node set
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the node set to return
    * @return {Promise<NodeInfo>} - the node information
    * @memberof RED.nodes
    */
    getNodeInfo: function(opts) {
        return new Promise(function(resolve,reject) {
            var id = opts.id;
            var result = redNodes.getNodeInfo(id);
            if (result) {
                runtime.log.audit({event: "nodes.info.get",id:id});
                delete result.loaded;
                return resolve(result);
            } else {
                runtime.log.audit({event: "nodes.info.get",id:id,error:"not_found"});
                var err = new Error();
                err.code = "not_found";
                err.status = 404;
                return reject(err);
            }
        })
    },

    /**
    * Gets the list of node modules installed in the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @return {Promise<NodeList>} - the list of node modules
    * @memberof RED.nodes
    */
    getNodeList: function(opts) {
        return new Promise(function(resolve,reject) {
            runtime.log.audit({event: "nodes.list.get"});
            return resolve(runtime.nodes.getNodeList());
        })
    },

    /**
    * Gets an individual node's html content
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the node set to return
    * @param {String} opts.lang - the locale language to return
    * @return {Promise<String>} - the node html content
    * @memberof RED.nodes
    */
    getNodeConfig: function(opts) {
        return new Promise(function(resolve,reject) {
            var id = opts.id;
            var lang = opts.lang;
            var result = runtime.nodes.getNodeConfig(id,lang);
            if (result) {
                runtime.log.audit({event: "nodes.config.get",id:id});
                return resolve(result);
            } else {
                runtime.log.audit({event: "nodes.config.get",id:id,error:"not_found"});
                var err = new Error();
                err.code = "not_found";
                err.status = 404;
                return reject(err);
            }
        });
    },
    /**
    * Gets all node html content
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.lang - the locale language to return
    * @return {Promise<String>} - the node html content
    * @memberof RED.nodes
    */
    getNodeConfigs: function(opts) {
        return new Promise(function(resolve,reject) {
            runtime.log.audit({event: "nodes.configs.get"});
            return resolve(runtime.nodes.getNodeConfigs(opts.lang));
        });
    },

    /**
    * Gets the info of a node module
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.module - the id of the module to return
    * @return {Promise<ModuleInfo>} - the node module info
    * @memberof RED.nodes
    */
    getModuleInfo: function(opts) {
        return new Promise(function(resolve,reject) {
            var module = opts.module;
            var result = redNodes.getModuleInfo(module);
            if (result) {
                runtime.log.audit({event: "nodes.module.get",id:id});
                return resolve(result);
            } else {
                runtime.log.audit({event: "nodes.module.get",id:id,error:"not_found"});
                var err = new Error();
                err.code = "not_found";
                err.status = 404;
                return reject(err);
            }
        })
    },

    /**
    * Install a new module into the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.module - the id of the module to install
    * @param {String} opts.version - (optional) the version of the module to install
    * @return {Promise<ModuleInfo>} - the node module info
    * @memberof RED.nodes
    */
    addModule: function(opts) {
        return new Promise(function(resolve,reject) {
            if (!runtime.settings.available()) {
                runtime.log.audit({event: "nodes.install",error:"settings_unavailable"});
                let err = new Error("Settings unavailable");
                err.code = "settings_unavailable";
                err.status = 400;
                return reject(err);
            }
            if (opts.module) {
                var existingModule = runtime.nodes.getModuleInfo(opts.module);
                if (existingModule) {
                    if (!opts.version || existingModule.version === opts.version) {
                        runtime.log.audit({event: "nodes.install",module:opts.module, version:opts.version, error:"module_already_loaded"});
                        let err = new Error("Module already loaded");
                        err.code = "module_already_loaded";
                        err.status = 400;
                        return reject(err);
                    }
                    if (!module.local) {
                        runtime.log.audit({event: "nodes.install",module:opts.module, version:opts.version, error:"module_not_local"});
                        let err = new Error("Module not locally installed");
                        err.code = "module_not_local";
                        err.status = 400;
                        return reject(err);
                    }
                }
                runtime.nodes.installModule(opts.module,opts.version).then(function(info) {
                    runtime.log.audit({event: "nodes.install",module:opts.module,version:opts.version});
                    return resolve(info);
                }).catch(function(err) {
                    if (err.code === 404) {
                        runtime.log.audit({event: "nodes.install",module:opts.module,version:opts.version,error:"not_found"});
                        // TODO: code/status
                        err.status = 404;
                    } else if (err.code) {
                        err.status = 400;
                        runtime.log.audit({event: "nodes.install",module:opts.module,version:opts.version,error:err.code});
                    } else {
                        err.status = 400;
                        runtime.log.audit({event: "nodes.install",module:opts.module,version:opts.version,error:err.code||"unexpected_error",message:err.toString()});
                    }
                    return reject(err);
                })
            } else {
                runtime.log.audit({event: "nodes.install",module:opts.module,error:"invalid_request"});
                let err = new Error("Invalid request");
                err.code = "invalid_request";
                err.status = 400;
                return reject(err);
            }

        });
    },
    /**
    * Removes a module from the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.module - the id of the module to remove
    * @return {Promise} - resolves when complete
    * @memberof RED.nodes
    */
    removeModule: function(opts) {
        return new Promise(function(resolve,reject) {
            if (!runtime.settings.available()) {
                runtime.log.audit({event: "nodes.install",error:"settings_unavailable"});
                let err = new Error("Settings unavailable");
                err.code = "settings_unavailable";
                err.status = 400;
                return reject(err);
            }
            var module = runtime.nodes.getModuleInfo(opts.module);
            if (!module) {
                runtime.log.audit({event: "nodes.remove",module:opts.module,error:"not_found"});
                var err = new Error();
                err.code = "not_found";
                err.status = 404;
                return reject(err);
            }
            try {
                runtime.nodes.uninstallModule(opts.module).then(function() {
                    runtime.log.audit({event: "nodes.remove",module:opts.module});
                    resolve();
                }).catch(function(err) {
                    err.status = 400;
                    runtime.log.audit({event: "nodes.remove",module:opts.module,error:err.code||"unexpected_error",message:err.toString()});
                    return reject(err);
                })
            } catch(err) {
                runtime.log.audit({event: "nodes.remove",module:opts.module,error:err.code||"unexpected_error",message:err.toString()});
                err.status = 400;
                return reject(err);
            }
        });
    },

    /**
    * Enables or disables a module in the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.module - the id of the module to enable or disable
    * @param {String} opts.enabled - whether the module should be enabled or disabled
    * @return {Promise<ModuleInfo>} - the module info object
    * @memberof RED.nodes
    */
    setModuleState: function(opts) {
        return new Promise(function(resolve,reject) {
            if (!runtime.settings.available()) {
                runtime.log.audit({event: "nodes.module.set",error:"settings_unavailable"});
                let err = new Error("Settings unavailable");
                err.code = "settings_unavailable";
                err.status = 400;
                return reject(err);
            }
            try {
                var mod = opts.module;
                var module = runtime.nodes.getModuleInfo(mod);
                if (!module) {
                    runtime.log.audit({event: "nodes.module.set",module:mod,error:"not_found"});
                    var err = new Error();
                    err.code = "not_found";
                    err.status = 404;
                    return reject(err);
                }

                var nodes = module.nodes;
                var promises = [];
                for (var i = 0; i < nodes.length; ++i) {
                    promises.push(putNode(nodes[i],opts.enabled));
                }
                Promise.all(promises).then(function() {
                    return resolve(runtime.nodes.getModuleInfo(mod));
                }).catch(function(err) {
                    err.status = 400;
                    return reject(err);
                });
            } catch(err) {
                runtime.log.audit({event: "nodes.module.set",module:mod,enabled:opts.enabled,error:err.code||"unexpected_error",message:err.toString()});
                err.status = 400;
                return reject(err);
            }
        });
    },

    /**
    * Enables or disables a n individual node-set in the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {String} opts.id - the id of the node-set to enable or disable
    * @param {String} opts.enabled - whether the module should be enabled or disabled
    * @return {Promise<ModuleInfo>} - the module info object
    * @memberof RED.nodes
    */
    setNodeSetState: function(opts) {
        return new Promise(function(resolve,reject) {
            if (!runtime.settings.available()) {
                runtime.log.audit({event: "nodes.info.set",error:"settings_unavailable"});
                let err = new Error("Settings unavailable");
                err.code = "settings_unavailable";
                err.status = 400;
                return reject(err);
            }

            var id = opts.id;
            var enabled = opts.enabled;
            try {
                var node = runtime.nodes.getNodeInfo(id);
                if (!node) {
                    runtime.log.audit({event: "nodes.info.set",id:id,error:"not_found"});
                    var err = new Error();
                    err.code = "not_found";
                    err.status = 404;
                    return reject(err);
                } else {
                    delete node.loaded;
                    putNode(node,enabled).then(function(result) {
                        runtime.log.audit({event: "nodes.info.set",id:id,enabled:enabled});
                        return resolve(result);
                    }).catch(function(err) {
                        runtime.log.audit({event: "nodes.info.set",id:id,enabled:enabled,error:err.code||"unexpected_error",message:err.toString()});
                        err.status = 400;
                        return reject(err);
                    });
                }
            } catch(err) {
                runtime.log.audit({event: "nodes.info.set",id:id,enabled:enabled,error:err.code||"unexpected_error",message:err.toString()});
                res.status(400).json({error:err.code||"unexpected_error", message:err.toString()});
            }
        });
    },

    /**
    * TODO: getModuleCatalogs
    */
    getModuleCatalogs: function() {},
    /**
    * TODO: getModuleCatalog
    */
    getModuleCatalog: function() {},

    /**
    * Gets the list of all icons available in the modules installed within the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @return {Promise<IconList>} - the list of all icons
    * @memberof RED.nodes
    */
    getIconList: function(opts) {
        return new Promise(function(resolve,reject) {
            runtime.log.audit({event: "nodes.icons.get"});
            return resolve(runtime.nodes.getNodeIcons());
        });

    },
    /**
    * TODO: getIcon
    */
    getIcon: function() {}
}
