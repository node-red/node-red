RED.plugins = (function() {
    var plugins = {};
    var pluginsByType = {};

    function registerPlugin(id,definition) {
        plugins[id] = definition;
        if (definition.type) {
            pluginsByType[definition.type] = pluginsByType[definition.type] || [];
            pluginsByType[definition.type].push(definition);
        }
        if (RED._loadingModule) {
            definition.module = RED._loadingModule;
            definition["_"] = function() {
                var args = Array.prototype.slice.call(arguments);
                var originalKey = args[0];
                if (!/:/.test(args[0])) {
                    args[0] = definition.module+":"+args[0];
                }
                var result = RED._.apply(null,args);
                if (result === args[0]) {
                    return originalKey;
                }
                return result;
            }
        } else {
            definition["_"] = RED["_"]
        }
        if (definition.onadd && typeof definition.onadd === 'function') {
            definition.onadd();
        }
        RED.events.emit("registry:plugin-added",id);
    }

    function getPlugin(id) {
        return plugins[id]
    }

    function getPluginsByType(type) {
        return pluginsByType[type] || [];
    }
    return {
        registerPlugin: registerPlugin,
        getPlugin: getPlugin,
        getPluginsByType: getPluginsByType
    }
})();
