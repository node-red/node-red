module.exports = function(RED) {
    console.log("Loaded test-plugin/test-runtime-plugin")

    RED.plugins.registerPlugin("my-test-runtime-only-plugin", {
        type: "bar",
        onadd: function() {
            console.log("my-test-runtime-only-plugin.onadd called")
        }
    })
}