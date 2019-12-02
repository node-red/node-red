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

function fileInNode(id) {
    nodePage.call(this, id);
}

util.inherits(fileInNode, nodePage);

var formatType = {
    "utf8": 1,
    "lines": 2,
    "": 3,  // a single Buffer object
    "stream": 4
};

fileInNode.prototype.setFilename = function(filename) {
    browser.setValue('#node-input-filename', filename);
}

fileInNode.prototype.setOutput = function(format) {
    browser.clickWithWait('#node-input-format');
    var formatTypeXPath = '//*[@id="node-input-format"]/option[' + formatType[format] + ']';
    browser.clickWithWait(formatTypeXPath);
}

module.exports = fileInNode;
