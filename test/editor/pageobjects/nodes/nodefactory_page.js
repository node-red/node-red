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
var templateNode = require('./core/core/80-template_page');
var functionNode = require('./core/core/80-function_page');
var httpinNode = require('./core/io/21-httpin_page');
var httpResponseNode = require('./core/io/21-httpresponse_page');
var changeNode = require('./core/logic/15-change_page');
var rangeNode = require('./core/logic/16-range_page');
var httpRequestNode = require('./core/io/21-httprequest_page');
var htmlNode = require('./core/parsers/70-HTML_page');
var fileinNode = require('./core/storage/50-filein_page');


var nodeCatalog = {
    // input
    "inject": injectNode,
    "httpin": httpinNode,
    // output
    "debug": debugNode,
    "httpResponse": httpResponseNode,
    // function
    "function": functionNode,
    "template": templateNode,
    "change": changeNode,
    "range": rangeNode,
    "httpRequest": httpRequestNode,
    "html": htmlNode,
    // storage
    "filein": fileinNode,
}

function create(type, id) {
    var node = nodeCatalog[type];
    return new node(id);
}

module.exports = {
    create: create,
};
