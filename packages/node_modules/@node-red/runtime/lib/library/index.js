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


var knownTypes = {};

var libraries = {};


function init(runtime) {
    knownTypes = {
        'flows': 'node-red'
    };

    libraries["_examples_"] = require("./examples");
    libraries["_examples_"].init(runtime);
    libraries["local"] = require("./local");
    libraries["local"].init(runtime);

}

function registerType(id,type) {
    // TODO: would like to enforce this, but currently the tests register the same type multiple
    //       times and have no way to remove themselves.
    // if (knownTypes.hasOwnProperty(type)) {
    //     throw new Error(`Library type '${type}' already registered by ${id}'`)
    // }
    knownTypes[type] = id;
}

function getEntry(library,type,path) {
    if (!knownTypes.hasOwnProperty(type)) {
        throw new Error(`Unknown library type '${type}'`);
    }
    if (libraries.hasOwnProperty(library)) {
        return libraries[library].getEntry(type,path);
    } else {
        throw new Error(`Unknown library '${library}'`);
    }
}
function saveEntry(library,type,path,meta,body) {
    if (!knownTypes.hasOwnProperty(type)) {
        throw new Error(`Unknown library type '${type}'`);
    }
    if (libraries.hasOwnProperty(library)) {
        if (libraries[library].hasOwnProperty("saveEntry")) {
            return libraries[library].saveEntry(type,path,meta,body);
        } else {
            throw new Error(`Library '${library}' is read-only`);
        }
    } else {
        throw new Error(`Unknown library '${library}'`);
    }
}

module.exports = {
    init: init,
    register: registerType,
    getEntry: getEntry,
    saveEntry: saveEntry

}
