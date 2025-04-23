const os = require('os')

module.exports = (_) => {
    return {
        'os.type': os.type(),
        'os.release': os.release(),
        'os.arch': os.arch()
    }
}
