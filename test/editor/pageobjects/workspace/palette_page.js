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

var idMap = {
    // input
    "inject": "#palette_node_inject",
    "httpin": "#palette_node_http_in",
    // output
    "debug": "#palette_node_debug",
    "httpResponse": "#palette_node_http_response",
    // function
    "function": "#palette_node_function",
    "template": "#palette_node_template",
    "change": "#palette_node_change",
    "range": "#palette_node_range",
    "httpRequest": "#palette_node_http_request",
    "html": "#palette_node_html",
    // storage
    "filein": "#palette_node_file_in",
};

function getId(type) {
    return idMap[type];
}

module.exports = {
    getId: getId,
};
