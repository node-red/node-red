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

function setMethod(type) {
    browser.selectByValue('#node-input-method', type);
}

util.inherits(httpinNode, nodePage);

var methodType = {
    "get": 1,
    "post": 2,
    "put": 3,
    "delete": 4,
    "patch": 5,
};

httpinNode.prototype.setMethod = function(type) {
  // Open a method type list.
  browser.clickWithWait('#node-input-method');
  // Select a method type.
  var methodTypeXPath = '//*[@id="node-input-method"]/option[' + methodType[type] + ']';
  browser.clickWithWait(methodTypeXPath);
}

httpinNode.prototype.setUrl = function(value) {
    browser.setValue('#node-input-url', value);
}

module.exports = httpinNode;
