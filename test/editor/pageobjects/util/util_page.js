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

var waitTime = 5000;

function repeatUntilSuccess(operation, args) {
    // Wait at most 10 seconds.
    for (var i = 0; i < 200; i++) {
        try {
            var ret = operation(args);
            return ret;
        } catch (e) {
            if (i === 199) {
                console.trace();
                throw e;
            }
            browser.pause(50);
        }
    }
}

function init() {
    browser.addCommand("clickWithWait", function(selector) {
        try {
            // This is necessary because there is a case that the target may exist but still moving.
            browser.pause(50);
            browser.waitForVisible(selector);

            var ret = repeatUntilSuccess(function(selector) {
                return browser.click(selector);
            }, selector);
            return ret;
        } catch (e) {
            console.trace();
            throw e;
        }
    }, false);

    browser.addCommand("getTextWithWait", function(selector) {
        try {
            browser.waitForExist(selector);
            browser.waitForValue(selector);

            var ret = repeatUntilSuccess(function(selector) {
                return browser.getText(selector);
            }, selector);
            return ret;
        } catch (e) {
            console.trace();
            throw e;
        }
    }, false);

    browser.addCommand("selectWithWait", function(selector, value) {
        try {
            browser.waitForVisible(selector, waitTime);

            var ret = repeatUntilSuccess(function(args) {
                return browser.selectByValue(args[0], args[1]);
            }, [selector, value.toString()]);
            return ret;
        } catch (e) {
            console.trace();
            throw e;
        }
    }, false);
}

 module.exports = {
     init: init,
 };
