const process = require('process')

module.exports = (runtime) => {
    return {
        'env.nodejs': process.version.replace(/^v/, ''),
        'env.node-red': runtime.settings.version
    }
}
