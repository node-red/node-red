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

function open() {
    browser.clickWithWait('#red-ui-tab-debug-link-button');
}

function getMessage(index) {
    index = index ? index : 1;
    var debugMessagePath = '//div[@class="debug-content debug-content-list"]/div[contains(@class,"debug-message")][' + index + ']//span[contains(@class, "debug-message-type")]';
    return browser.getTextWithWait(debugMessagePath);
}

function clearMessage() {
    browser.clickWithWait('//a[@id="debug-tab-clear"]');
}

module.exports = {
    open: open,
    getMessage: getMessage,
    clearMessage: clearMessage,
};
