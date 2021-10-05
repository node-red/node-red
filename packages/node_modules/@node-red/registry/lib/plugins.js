const registry = require("./registry");
const {events} = require("@node-red/util");
const clone = require("clone");

let pluginConfigCache = {};
let pluginToId = {};
let plugins = {};
let pluginsByType = {};
let pluginSettings = {};
let settings;

function init(_settings) {
    settings = _settings;
    plugins = {};
    pluginConfigCache = {};
    pluginToId = {};
    pluginsByType = {};
    pluginSettings = {};
}

function registerPlugin(nodeSetId,id,definition) {
    var moduleId = registry.getModuleFromSetId(nodeSetId);
    var pluginId = registry.getNodeFromSetId(nodeSetId);

    definition.id = id;
    definition.module = moduleId;
    pluginToId[id] = nodeSetId;
    plugins[id] = definition;
    var module = registry.getModule(moduleId);

    definition.path = module.path;

    module.plugins[pluginId].plugins.push(definition);
    if (definition.type) {
        pluginsByType[definition.type] = pluginsByType[definition.type] || [];
        pluginsByType[definition.type].push(definition);
    }
    if (definition.settings) {
        pluginSettings[id] = definition.settings;
    }


    if (definition.onadd && typeof definition.onadd === 'function') {
        definition.onadd();
    }
    events.emit("registry:plugin-added",id);
}

function getPlugin(id) {
    return plugins[id]
}

function getPluginsByType(type) {
    return pluginsByType[type] || [];
}

function getPluginConfigs(lang) {
    if (!pluginConfigCache[lang]) {
        var result = "";
        var script = "";
        var moduleConfigs = registry.getModuleList();
        for (var module in moduleConfigs) {
            /* istanbul ignore else */
            if (moduleConfigs.hasOwnProperty(module)) {
                var plugins = moduleConfigs[module].plugins;
                for (var plugin in plugins) {
                    if (plugins.hasOwnProperty(plugin)) {
                        var config = plugins[plugin];
                        if (config.enabled && !config.err && config.config) {
                            result += "\n<!-- --- [red-plugin:"+config.id+"] --- -->\n";
                            result += config.config;
                        }
                    }
                }
            }
        }
        pluginConfigCache[lang] = result;
    }
    return pluginConfigCache[lang];
}
function getPluginList() {
    var list = [];
    var moduleConfigs = registry.getModuleList();
    for (var module in moduleConfigs) {
        /* istanbul ignore else */
        if (moduleConfigs.hasOwnProperty(module)) {
            var plugins = moduleConfigs[module].plugins;
            for (var plugin in plugins) {
                /* istanbul ignore else */
                if (plugins.hasOwnProperty(plugin)) {
                    var pluginInfo = registry.filterNodeInfo(plugins[plugin]);
                    pluginInfo.version = moduleConfigs[module].version;
                    // if (moduleConfigs[module].pending_version) {
                    //     nodeInfo.pending_version = moduleConfigs[module].pending_version;
                    // }
                    list.push(pluginInfo);
                }
            }
        }
    }
    return list;
}

function exportPluginSettings(safeSettings) {
    for (let id in pluginSettings) {
        if (pluginSettings.hasOwnProperty(id)) {
            if (settings.hasOwnProperty(id) && !safeSettings.hasOwnProperty(id)) {
                let pluginTypeSettings = pluginSettings[id];
                let exportedSet = {};
                let defaultExportable = false;
                if (pluginTypeSettings['*'] && pluginTypeSettings['*'].hasOwnProperty("exportable")) {
                    defaultExportable = pluginTypeSettings['*'].exportable;
                }
                if (defaultExportable) {
                    exportedSet = clone(settings[id]);
                }
                for (let property in pluginTypeSettings) {
                    if (pluginTypeSettings.hasOwnProperty(property)) {
                        let setting = pluginTypeSettings[property];
                        if (defaultExportable) {
                            if (setting.exportable === false) {
                                delete exportedSet[property]
                            } else if (!exportedSet.hasOwnProperty(property) && setting.hasOwnProperty('value')) {
                                exportedSet[property] = setting.value;
                            }
                        } else if (setting.exportable) {
                            if (settings[id].hasOwnProperty(property)) {
                                exportedSet[property] = settings[id][property];
                            } else if (setting.hasOwnProperty('value')) {
                                exportedSet[property] = setting.value;
                            }
                        }
                    }
                }
                if (Object.keys(exportedSet).length > 0) {
                    safeSettings[id] = exportedSet;
                }
            }
        }
    }

    return safeSettings;
}

module.exports = {
    init,
    registerPlugin,
    getPlugin,
    getPluginsByType,
    getPluginConfigs,
    getPluginList,
    exportPluginSettings
}
