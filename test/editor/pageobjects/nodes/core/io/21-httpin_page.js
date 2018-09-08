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

var util = require("util");

var nodePage = require("../../node_page");

function httpinNode(id) {
    nodePage.call(this, id);
}

util.inherits(httpinNode, nodePage);

httpinNode.prototype.setMethod = function(method) {
    browser.selectWithWait('#node-input-method', method);
}

httpinNode.prototype.setUrl = function(url) {
    browser.setValue('#node-input-url', url);
}

module.exports = httpinNode;
