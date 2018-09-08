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

function functionNode(id) {
    nodePage.call(this, id);
}

util.inherits(functionNode, nodePage);

functionNode.prototype.setFunction = function(func) {
    browser.click('#node-input-func-editor');
    browser.keys(['Control', 'Home', 'Control']);
    for (var i = 0; i < func.length; i++) {
        browser.keys([func.charAt(i)]);
    }
    // Delete the unnecessary code that ace editor does the autocompletion.
    browser.keys(['Control', 'Shift', 'End', 'Shift', 'Control']);
    browser.keys(['Delete']);
    // Need to wait until ace editor correctly checks the syntax.
    browser.pause(50);
}

module.exports = functionNode;
