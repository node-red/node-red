/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var fs = require('fs');
var fspath = require('path');

var runtime;
var knownTypes = {};

var storage;

function init(_runtime) {
    runtime = _runtime;
    storage = runtime.storage;
    knownTypes = {};
}

function registerType(id,type) {
    // TODO: would like to enforce this, but currently the tests register the same type multiple
    //       times and have no way to remove themselves.
    // if (knownTypes.hasOwnProperty(type)) {
    //     throw new Error(`Library type '${type}' already registered by ${id}'`)
    // }
    knownTypes[type] = id;
}

// function getAllEntries(type) {
//     if (!knownTypes.hasOwnProperty(type)) {
//         throw new Error(`Unknown library type '${type}'`);
//     }
// }

function getEntry(type,path) {
    if (type !== 'flows') {
        if (!knownTypes.hasOwnProperty(type)) {
            throw new Error(`Unknown library type '${type}'`);
        }
        return storage.getLibraryEntry(type,path);
    } else {
        return new Promise(function(resolve,reject) {
            if (path.indexOf("_examples_/") === 0) {
                var m = /^_examples_\/(@.*?\/[^\/]+|[^\/]+)\/(.*)$/.exec(path);
                if (m) {
                    var module = m[1];
                    var entryPath = m[2];
                    var fullPath = runtime.nodes.getNodeExampleFlowPath(module,entryPath);
                    if (fullPath) {
                        try {
                            fs.readFile(fullPath,'utf8',function(err, data) {
                                runtime.log.audit({event: "library.get",type:"flow",path:path});
                                if (err) {
                                    return reject(err);
                                }
                                return resolve(data);
                            })
                        } catch(err) {
                            return reject(err);
                        }
                        return;
                    }
                }
                // IF we get here, we didn't find the file
                var error = new Error("not_found");
                error.code = "not_found";
                return reject(error);
            } else {
                resolve(storage.getFlow(path));
            }
        });
    }
}
function saveEntry(type,path,meta,body) {
    if (type !== 'flows') {
        if (!knownTypes.hasOwnProperty(type)) {
            throw new Error(`Unknown library type '${type}'`);
        }
        return storage.saveLibraryEntry(type,path,meta,body);
    } else {
        return storage.saveFlow(path,body);
    }
}

module.exports = {
    init: init,
    register: registerType,
    // getAllEntries: getAllEntries,
    getEntry: getEntry,
    saveEntry: saveEntry

}
