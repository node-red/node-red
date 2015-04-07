/**
 * Copyright 2014, 2015 IBM Corp.
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

var when = require("when");
var fs = require("fs");
var path = require("path");

var events = require("../../events");
var registry = require("./registry");
var loader = require("./loader");

var settings;

function init(_settings) {
    settings = _settings;
    registry.init(settings);
    loader.init(settings);
}
//TODO: defaultNodesDir/disableNodePathScan are to make testing easier.
//      When the tests are componentized to match the new registry structure,
//      these flags belong on localfilesystem.load, not here.
function load(defaultNodesDir,disableNodePathScan) {
    return loader.load(defaultNodesDir,disableNodePathScan);
}

function addModule(module) {
    return loader.addModule(module).then(function() {
        return registry.getModuleInfo(module);
    });
}

function enableNodeSet(typeOrId) {
    registry.enableNodeSet(typeOrId);
    var nodeSet = registry.getNodeInfo(typeOrId);
    if (!nodeSet.loaded) {
        loader.loadNodeSet(nodeSet);
        return registry.getNodeInfo(typeOrId);
    }
    return nodeSet;
}

module.exports = {
    init:init,
    load:load,
    clear: registry.clear,
    registerType: registry.registerNodeConstructor,

    get: registry.getNodeConstructor,
    getNodeInfo: registry.getNodeInfo,
    getNodeList: registry.getNodeList,

    getModuleInfo: registry.getModuleInfo,
    getModuleList: registry.getModuleList,

    getNodeConfigs: registry.getAllNodeConfigs,
    getNodeConfig: registry.getNodeConfig,

    enableNode: enableNodeSet,
    disableNode: registry.disableNodeSet,

    addModule: addModule,
    removeModule: registry.removeModule,
    
    cleanModuleList: registry.cleanModuleList
};
