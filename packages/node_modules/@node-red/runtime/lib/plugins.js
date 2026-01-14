const registry = require("@node-red/registry");

module.exports = {
    init: function() {},
    registerPlugin: registry.registerPlugin,
    getPlugin: registry.getPlugin,
    getPluginInfo: registry.getPluginInfo,
    getPluginsByType: registry.getPluginsByType,
    getPluginList: registry.getPluginList,
    getPluginConfigs: registry.getPluginConfigs,
    getPluginConfig: registry.getPluginConfig,
    exportPluginSettings: registry.exportPluginSettings
}