// A test node that exports a function which returns a rejecting promise

module.exports = function(RED) {
    return new Promise(function(resolve,reject) {
        reject("fail");
    });
}
