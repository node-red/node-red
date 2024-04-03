RED.plugins = (function() {
    var plugins = {};
    var pluginsByType = {};
    var moduleList = {};

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

    function setPluginList(list) {
        for(let i=0;i<list.length;i++) {
            let p = list[i];
            addPlugin(p);
        }
    }

    function addPlugin(p) {

        moduleList[p.module] = moduleList[p.module] || {
            name:p.module,
            version:p.version,
            local:p.local,
            sets:{},
            plugin: true,
            id: p.id
        };
        if (p.pending_version) {
            moduleList[p.module].pending_version = p.pending_version;
        }
        moduleList[p.module].sets[p.name] = p;

        RED.events.emit("registry:plugin-module-added",p.module);
    }

    function getModule(module) {
        return moduleList[module];
    }

    return {
        registerPlugin: registerPlugin,
        getPlugin: getPlugin,
        getPluginsByType: getPluginsByType,

        setPluginList: setPluginList,
        addPlugin: addPlugin,
        getModule: getModule
    }
})();
