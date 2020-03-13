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

debugNode.prototype.setOutput = function (complete) {
    // Open a payload type list.
    browser.clickWithWait('//*[contains(@class, "red-ui-typedInput-container")]/button');
    if (complete !== 'true') {
        // Select the "msg" type.
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options")][1]/a[1]');
        // Input the path in msg.
        browser.clickWithWait('//*[contains(@class, "red-ui-typedInput-input")]/input');
        browser.keys(Array('payload'.length).fill('Backspace'));
        browser.setValue('//*[contains(@class, "red-ui-typedInput-input")]/input', complete);
    } else {
        // Select the "complete msg object" type.
        browser.clickWithWait('/html/body/div[11]/a[2]');
    }
}

module.exports = debugNode;
