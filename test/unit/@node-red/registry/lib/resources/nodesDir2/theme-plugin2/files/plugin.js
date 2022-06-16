module.exports = function (RED) {
    RED.plugins.registerPlugin('test-theme', {
        type: 'node-red-theme',
        scripts: [
            'files/clientside.js'
        ],
        css: [
            'files/theme.css',
        ],
        monacoOptions: {
            theme: "vs"
        }
    })
}
