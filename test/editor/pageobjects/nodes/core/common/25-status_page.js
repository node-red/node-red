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

var util = require('util');

var nodePage = require('../../node_page');

function statusNode(id) {
    nodePage.call(this, id);
}

util.inherits(statusNode, nodePage);

statusNode.prototype.setScope = function (scope) {
    if (scope) {
        browser.selectWithWait('#node-input-scope-select', 'target');
        browser.clickWithWait('//*[@id="node-input-status-target-select"]');
        browser.pause(1000);
        if (Array.isArray(scope)) {
            for (var i = 0; i < scope.length; i++) {
                browser.moveToObject(scope[i].id);
                browser.buttonDown();
                browser.buttonUp();
            }
        } else {
            browser.moveToObject(scope.id);
            browser.buttonDown();
            browser.buttonUp();
        }
        browser.clickWithWait('//*[contains(@class, "red-ui-notification")]/div/button[2]');
        browser.pause(1000);
    }
}

module.exports = statusNode;
