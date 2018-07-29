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

function debugNode(id) {
    nodePage.call(this, id);
}

util.inherits(debugNode, nodePage);

var target = {
    "msg": 1,
    "full": 2
};

debugNode.prototype.setTarget = function(type, value) {
    // Open a payload type list.
    browser.clickWithWait('//*[contains(@class, "red-ui-typedInput-container")]/button');
    // Select a payload type.
    var xPath = '/html/body/div[11]/a[' + target[type] + ']';
    browser.clickWithWait(xPath);
    if (value) {
        browser.clickWithWait('//*[contains(@class, "red-ui-typedInput-input")]/input');
        browser.keys(['Control', 'a', 'Control']);
        browser.keys(['Delete']);
        browser.setValue('//*[contains(@class, "red-ui-typedInput-input")]/input', value);
    }
}

module.exports = debugNode;
