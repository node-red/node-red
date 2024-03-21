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

    // reset the cache when a new plugin is incoming!
    pluginConfigCache = {};

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
    // we're not re-using getPluginConfig() here,
    // to avoid calling registry.getModuleList() multiple times!

    if (!pluginConfigCache[lang]) {
        var result = "";
        var moduleConfigs = registry.getModuleList();
        for (var module in moduleConfigs) {
            /* istanbul ignore else */
            if (moduleConfigs.hasOwnProperty(module)) {
                result += generateModulePluginConfig(moduleConfigs[module]);
            }
        }
        pluginConfigCache[lang] = result;
    }
    return pluginConfigCache[lang];
}

function getPluginConfig(id, lang) {
    let result = '';
    let moduleConfigs = registry.getModuleList();
    if (moduleConfigs.hasOwnProperty(id)) {
        result = generateModulePluginConfig(moduleConfigs[id]);
    }
    return result;
}

function generateModulePluginConfig(module) {
    let result = '';
    const plugins = module.plugins
    for (let plugin in plugins) {
        if (plugins.hasOwnProperty(plugin)) {
            let config = plugins[plugin];
            if (config.enabled && !config.err && config.config) {
                result += "\n<!-- --- [red-plugin:"+config.id+"] --- -->\n";
                result += config.config;
            }
        }
    }
    return result;
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

function removeModule(moduleId) {

    // clean the (plugin) registry when a module is removed / uninstalled

    let pluginList = [];
    let module = registry.getModule(moduleId);
    let keys = Object.keys(module.plugins ?? {});
    keys.forEach( key => {
        let _plugins = module.plugins[key].plugins ?? [];
        _plugins.forEach( plugin => {
            let id = plugin.id;

            if (plugin.onremove && typeof plugin.onremove === 'function') {
                plugin.onremove();
            }

            delete pluginToId[id];
            delete plugins[id];
            delete pluginSettings[id];
            pluginConfigCache = {};

            let psbtype = pluginsByType[plugin.type] ?? [];
            for (let i=psbtype.length; i>0; i--) {
                let pbt = psbtype[i-1];
                if (pbt.id == id) {
                    psbtype.splice(i-1, 1);
                }
            }
        })

        pluginList.push(registry.filterNodeInfo(module.plugins[key]));
        
    })

    return pluginList;
}

module.exports = {
    init,
    registerPlugin,
    getPlugin,
    getPluginsByType,
    getPluginConfigs,
    getPluginConfig,
    getPluginList,
    exportPluginSettings,
    removeModule
}
