module.exports = function(RED) {
    console.log("Loaded test-plugin/test")

    RED.plugins.registerPlugin("my-test-plugin", {
        type: "foo",
        onadd: function() {
            console.log("my-test-plugin.onadd called")
            RED.events.on("registry:plugin-added", function(id) {
                console.log(`my-test-plugin: plugin-added event "${id}"`)
            });
        }
    })
}