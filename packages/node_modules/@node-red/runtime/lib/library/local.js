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

var runtime;
var storage;

function init(_runtime) {
    runtime = _runtime;
    storage = runtime.storage;
}

function getEntry(type,path) {
    return storage.getLibraryEntry(type,path);
}
function saveEntry(type,path,meta,body) {
    return storage.saveLibraryEntry(type,path,meta,body);
}

module.exports = {
    name: 'local',
    init: init,
    getEntry: getEntry,
    saveEntry: saveEntry
}
