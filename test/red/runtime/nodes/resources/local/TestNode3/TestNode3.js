// A test node that exports a function which returns a rejecting promise

var when = require("when");
module.exports = function(RED) {
    return when.promise(function(resolve,reject) {
        reject("fail");
    });
}
