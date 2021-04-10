/*!
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
  * This module provides the node registry for the Node-RED runtime.
  *
  * It is responsible for loading node modules and making them available
  * to the runtime.
  *
  * @namespace @node-red/registry
  */

var registry = require("./registry");
var loader = require("./loader");
var installer = require("./installer");
var library = require("./library");
const externalModules = require("./externalModules")
var plugins = require("./plugins");

/**
 * Initialise the registry with a reference to a runtime object
 * @param  {Object} runtime - a runtime object
 * @memberof @node-red/registry
 */
function init(runtime) {
    installer.init(runtime.settings);
    // Loader requires the full runtime object because it initialises
    // the util module it. The Util module is responsible for constructing the
    // RED object passed to node modules when they are loaded.
    loader.init(runtime);
    plugins.init(runtime.settings);
    registry.init(runtime.settings,loader);
    library.init();
    externalModules.init(runtime.settings);
}

/**
 * Triggers the intial discovery and loading of all Node-RED node modules.
 * found on the node path.
 * @return {Promise} - resolves when the registry has finised discovering node modules.
 * @memberof @node-red/registry
 */
function load() {
    registry.load();
    return installer.checkPrereq().then(loader.load);
}

function addModule(module) {
    return loader.addModule(module).then(function() {
        return registry.getModuleInfo(module);
    });
}

function enableNodeSet(typeOrId) {
    return registry.enableNodeSet(typeOrId).then(function() {
        var nodeSet = registry.getNodeInfo(typeOrId);
        if (!nodeSet.loaded) {
            return loader.loadNodeSet(registry.getFullNodeInfo(typeOrId)).then(function() {
                return registry.getNodeInfo(typeOrId);
            });
        }
        return Promise.resolve(nodeSet);
    });
}

module.exports = {
    init:init,
    load:load,
    clear: registry.clear,

    /**
     * Register a node constructor function.
     *
     * @param {Object} nodeSet - the Node Set object the constructor is for
     * @param {String} type - the node type
     * @param {Function} constructor - the node constructor function
     * @function
     * @memberof @node-red/registry
     */
    registerType: registry.registerNodeConstructor,

    /**
     * Get a node constructor function.
     *
     * @param {String} type - the node type
     * @return {Function} the node constructor function
     * @function
     * @memberof @node-red/registry
     */
    get: registry.getNodeConstructor,

    registerSubflow: registry.registerSubflow,

    /**
     * Get a node's set information.
     *
     * @param {String} type - the node type or set identifier
     * @return {Object} the node set information
     * @function
     * @memberof @node-red/registry
     */
    getNodeInfo: registry.getNodeInfo,


    /**
     * Get a list of all nodes in the registry.
     *
     * @return {Object} the node list
     * @function
     * @memberof @node-red/registry
     */
    getNodeList: registry.getNodeList,

    /**
     * Get a modules's information.
     *
     * @param {String} type - the module identifier
     * @return {Object} the module information
     * @function
     * @memberof @node-red/registry
     */
    getModuleInfo: registry.getModuleInfo,

    /**
     * Get a list of all moduless in the registry.
     *
     * @return {Object} the module list
     * @function
     * @memberof @node-red/registry
     */
    getModuleList: registry.getModuleList,

    /**
     * Get the HTML configs for all nodes in the registry.
     *
     * @param {String} lang - the language to return, default `en-US`
     * @return {String} the node configs
     * @function
     * @memberof @node-red/registry
     */
    getNodeConfigs: registry.getAllNodeConfigs,

    /**
     * Get the HTML config for a single node set.
     *
     * @param {String} id - the node identifier
     * @param {String} lang - the language to return, default `en-US`
     * @return {String} the node config
     * @function
     * @memberof @node-red/registry
     */
    getNodeConfig: registry.getNodeConfig,

    /**
     * Get the local path to a node's icon file.
     *
     * @param {String} module - the module that provides the icon
     * @param {String} icon - the name of the icon
     * @return {String} the local path to the icon
     * @function
     * @memberof @node-red/registry
     */
    getNodeIconPath: registry.getNodeIconPath,


    /**
     * Get the full list of all icons available.
     *
     * @return {String} the icon list
     * @function
     * @memberof @node-red/registry
     */
    getNodeIcons: registry.getNodeIcons,

    /**
     * Enables a node set, making it available for use.
     *
     * @param {String} type - the node type or set identifier
     * @return {Promise} A promise that resolves when the node set has been enabled
     * @throws if the identifier is not recognised or runtime settings are unavailable
     * @function
     * @memberof @node-red/registry
     */
    enableNode: enableNodeSet,

    /**
     * Disables a node set, making it unavailable for use.
     *
     * @param {String} type - the node type or set identifier
     * @return {Promise} A promise that resolves when the node set has been disabled
     * @throws if the identifier is not recognised or runtime settings are unavailable
     * @function
     * @memberof @node-red/registry
     */
    disableNode: registry.disableNodeSet,


    /**
     * Loads a new module into the registry.
     *
     * This will rescan the node module paths looking for this module.
     *
     * @param {String} module - the name of the module to add
     * @return {Promise<Object>} A promise that resolves with the module information once it has been added
     * @throws if the module has already been added or the runtime settings are unavailable
     * @function
     * @memberof @node-red/registry
     */
    addModule: addModule,

    /**
     * Removes a module from the registry.
     *
     * @param {String} module - the name of the module to remove
     * @return {Promise<Array>} A promise that resolves with the list of removed node sets
     * @throws if the module is not found or the runtime settings are unavailable
     * @function
     * @memberof @node-red/registry
     */
    removeModule: registry.removeModule,

    /**
     * Installs a new node module using npm and then add to the registry
     *
     * @param {String|Buffer} module - the name of the module to install, or a Buffer containing a module tar file
     * @param {String} version - the version of the module to install, default: `latest`
     * @param {String} url - (optional) a url to install the module from
     * @return {Promise<Array>} A promise that resolves with the module information once it has been installed
     * @function
     * @memberof @node-red/registry
     */
    installModule: installer.installModule,


    /**
     * Uninstalls a module using npm
     *
     * @param {String} module - the name of the module to uninstall
     * @return {Promise<Array>} A promise that resolves when the module has been removed
     * @function
     * @memberof @node-red/registry
     */
    uninstallModule: installer.uninstallModule,

    /**
     * Update to internal list of available modules based on what has been actually
     * loaded.
     *
     * The `externalModules.autoInstall` (previously `autoInstallModules`)
     * runtime option means the runtime may try to install
     * missing modules after the initial load is complete. If that flag is not set
     * this function is used to remove the modules from the registry's saved list.
     * @function
     * @memberof @node-red/registry
     */
    cleanModuleList: registry.cleanModuleList,

    /**
     * Check if the regisrty is able to install/remove modules.
     *
     * This is based on whether it has found `npm` on the command-line.
     * @return {Boolean} whether the installer is enabled
     *
     * @function
     * @memberof @node-red/registry
     */
    installerEnabled: installer.installerEnabled,

    /**
     * Get a list of all example flows provided by nodes in the registry.
     * @return {Object} an object, indexed by module, listing all example flows
     *
     * @function
     * @memberof @node-red/registry
     */
    getNodeExampleFlows: library.getExampleFlows,


    /**
     * Gets the full path to a node example
     * @param {String} module - the name of the module providing the example
     * @param {String} path - the relative path of the example
     * @return {String} the full path to the example
     *
     * @function
     * @memberof @node-red/registry
     */
    getNodeExampleFlowPath: library.getExampleFlowPath,

    /**
     * Gets the full path to a module's resource file
     * @param {String} module - the name of the module providing the resource file
     * @param {String} path - the relative path of the resource file
     * @return {String} the full path to the resource file
     *
     * @function
     * @memberof @node-red/registry
     */
    getModuleResource: registry.getModuleResource,

    checkFlowDependencies: externalModules.checkFlowDependencies,

    registerPlugin: plugins.registerPlugin,
    getPlugin: plugins.getPlugin,
    getPluginsByType: plugins.getPluginsByType,
    getPluginList: plugins.getPluginList,
    getPluginConfigs: plugins.getPluginConfigs,
    exportPluginSettings: plugins.exportPluginSettings,


    deprecated: require("./deprecated")

};
