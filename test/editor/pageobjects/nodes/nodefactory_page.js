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

var injectNode = require('./core/common/20-inject_page');
var debugNode = require('./core/common/21-debug_page');
var functionNode = require('./core/function/10-function_page');
var changeNode = require('./core/function/15-change_page');
var rangeNode = require('./core/function/16-range_page');
var templateNode = require('./core/function/80-template_page');
var mqttInNode = require('./core/network/10-mqttin_page');
var mqttOutNode = require('./core/network/10-mqttout_page');
var httpInNode = require('./core/network/21-httpin_page');
var httpResponseNode = require('./core/network/21-httpresponse_page');
var httpRequestNode = require('./core/network/21-httprequest_page');
var htmlNode = require('./core/parsers/70-HTML_page');
var jsonNode = require('./core/parsers/70-JSON_page');
var fileInNode = require('./core/storage/10-filein_page');

var nodeCatalog = {
    // common
    "inject": injectNode,
    "debug": debugNode,
    // function
    "function": functionNode,
    "change": changeNode,
    "range": rangeNode,
    "template": templateNode,
    // network
    "mqttIn": mqttInNode,
    "mqttOut": mqttOutNode,
    "httpIn": httpInNode,
    "httpResponse": httpResponseNode,
    "httpRequest": httpRequestNode,
    // parser
    "html": htmlNode,
    "json": jsonNode,
    // storage
    "fileIn": fileInNode
};

function create(type, id) {
    var Node = nodeCatalog[type];
    return new Node(id);
}

module.exports = {
    create: create,
};
