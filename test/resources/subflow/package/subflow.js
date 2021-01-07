
module.exports = function(RED) {
    RED.nodes.registerSubflow(JSON.parse(require('fs').readFileSync(require("path").join(__dirname,"subflow.json"))))
}