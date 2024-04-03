/**
 * @mixin @node-red/runtime_plugins
 */

var runtime;

var api = module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
    },

    /**
    * Gets a plugin definition from the registry
    * @param {Object} opts
    * @param {String} opts.id - the id of the plugin to get
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<PluginDefinition>} - the plugin definition
    * @memberof @node-red/runtime_plugins
    */
    getPlugin: async function(opts) {
        return runtime.plugins.getPlugin(opts.id);
    },

    /**
    * Gets all plugin definitions of a given type
    * @param {Object} opts
    * @param {String} opts.type - the type of the plugins to get
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Array>} - the plugin definitions
    * @memberof @node-red/runtime_plugins
    */
    getPluginsByType: async function(opts) {
        return runtime.plugins.getPluginsByType(opts.type);
    },

    /**
    * Gets the editor content for an individual plugin
    * @param {String} opts.lang - the locale language to return
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<NodeInfo>} - the node information
    * @memberof @node-red/runtime_plugins
    */
    getPluginList: async function(opts) {
        runtime.log.audit({event: "plugins.list.get"}, opts.req);
        return runtime.plugins.getPluginList();
    },

    /**
    * Gets the editor content for all registered plugins
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<NodeInfo>} - the node information
    * @memberof @node-red/runtime_plugins
    */
    getPluginConfigs: async function(opts) {
        if (/[^0-9a-z=\-\*]/i.test(opts.lang)) {
            throw new Error("Invalid language: "+opts.lang)
            return;
        }
        runtime.log.audit({event: "plugins.configs.get"}, opts.req);
        return runtime.plugins.getPluginConfigs(opts.lang);
    },

    /**
    * Gets the editor content for one registered plugin
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {User} opts.user - the user calling the api
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<NodeInfo>} - the plugin information
    * @memberof @node-red/runtime_plugins
    */
    getPluginConfig: async function(opts) {
        if (/[^0-9a-z=\-\*]/i.test(opts.lang)) {
            throw new Error("Invalid language: "+opts.lang)
            return;
        }
        runtime.log.audit({event: "plugins.configs.get"}, opts.req);
        return runtime.plugins.getPluginConfig(opts.module, opts.lang);
    },

    /**
    * Gets all registered module message catalogs
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {User} opts.lang - the i18n language to return. If not set, uses runtime default (en-US)
    * @param {Object} opts.req - the request to log (optional)
    * @return {Promise<Object>} - the message catalogs
    * @memberof @node-red/runtime_plugins
    */
    getPluginCatalogs: async function(opts) {
        var lang = opts.lang;
        var prevLang = runtime.i18n.i.language;
        // Trigger a load from disk of the language if it is not the default
        return new Promise( (resolve,reject) => {
            runtime.i18n.i.changeLanguage(lang, function(){
                var nodeList = runtime.plugins.getPluginList();
                var result = {};
                nodeList.forEach(function(n) {
                    if (n.module !== "node-red") {
                        result[n.id] = runtime.i18n.i.getResourceBundle(lang, n.id)||{};
                    }
                });
                runtime.i18n.i.changeLanguage(prevLang);
                resolve(result);
            });
        });
    },
}
