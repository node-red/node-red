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

function init() {
    browser.addCommand("clickWithWait", function(selector) {
        browser.waitForVisible(selector);
        // Wait at most 10 seconds.
        for (var i = 0; i < 50; i++) {
            try {
                var ret = browser.click(selector);
                return ret;
            } catch (err) {
                if (err.message.indexOf('is not clickable') !== -1) {
                    browser.pause(200);
                } else {
                    throw err;
                }
            }
        }
    }, false);

    browser.addCommand("getTextWithWait", function(selector) {
        browser.waitForExist(selector);
        browser.waitForValue(selector);
        var ret = browser.getText(selector);
        return ret;
    }, false);

    browser.addCommand("selectWithWait", function(selector, value) {
        browser.waitForVisible(selector, 5000);
        var ret = browser.selectByValue(selector, value);
        return ret;
    }, false);
}

 module.exports = {
     init: init,
 };
