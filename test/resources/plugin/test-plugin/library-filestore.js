
module.exports = function(RED) {

    class FileStorePlugin {
        constructor(config) {
            this.id = config.id;
            this.name = config.name;
            this.config = config;
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


    RED.plugins.registerPlugin("node-red-library-filestore", {
        type: "node-red-library-source",
        class: FileStorePlugin
    })
}