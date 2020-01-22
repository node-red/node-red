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

var keyPage = require("../../../util/key_page");

function functionNode(id) {
    nodePage.call(this, id);
}

util.inherits(functionNode, nodePage);

functionNode.prototype.setFunction = function (func) {
    browser.clickWithWait('#node-input-func-editor');
    browser.keys(keyPage.selectAll());
    browser.keys(['Delete']);
    browser.keys(func);
    // Delete the unnecessary code that ace editor does the autocompletion.
    browser.keys(keyPage.selectToEnd());
    browser.keys(['Delete']);
    // Need to wait until ace editor correctly checks the syntax.
    browser.pause(300);
}

module.exports = functionNode;
