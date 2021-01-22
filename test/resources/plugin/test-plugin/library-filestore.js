
module.exports = function(RED) {
    const PLUGIN_TYPE_ID = "node-red-library-filestore";

    class FileStorePlugin {
        constructor(config) {
            this.type = PLUGIN_TYPE_ID;
            this.id = config.id;
            this.label = config.label;
            this.config = config.config;
            this.icon = config.icon;

            console.log("FileStorePlugin",config)
        }
        async init() {
            console.log("FileStorePlugin.init")

        }
        async getEntry(type,path) {
            console.log("FileStorePlugin.getLibraryEntry",type,path)
            return []
        }
        async saveEntry(type,path,meta,body) {
            console.log("FileStorePlugin.saveLibraryEntry",type,path)
        }
    }


    RED.plugins.registerPlugin(PLUGIN_TYPE_ID, {
        type: "node-red-library-source",
        class: FileStorePlugin,
        defaults: {
            "path": { value: "" },
            // "secret": { type: "password" }
        }
    })
}