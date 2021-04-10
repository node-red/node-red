const registry = require("@node-red/registry");

module.exports = {
    init: function() {},
    registerPlugin: registry.registerPlugin,
    getPlugin: registry.getPlugin,
    getPluginsByType: registry.getPluginsByType,
    getPluginList: registry.getPluginList,
    getPluginConfigs: registry.getPluginConfigs,
    exportPluginSettings: registry.exportPluginSettings
}