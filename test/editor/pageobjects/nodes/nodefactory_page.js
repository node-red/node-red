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

var injectNode = require('./core/core/20-inject_page');
var debugNode = require('./core/core/58-debug_page');
var changeNode = require('./core/logic/15-change_page');
var rangeNode = require('./core/logic/16-range_page');

var nodeCatalog = {
    // input
    "inject": injectNode,
    // output
    "debug": debugNode,
    // function
    "change": changeNode,
    "range": rangeNode,
}

function create(type, id) {
    var node = nodeCatalog[type];
    return new node(id);
}

module.exports = {
    create: create,
};
