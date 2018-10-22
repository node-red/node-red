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

function setServer(broker, port) {
    browser.setValue('#node-config-input-broker', broker);
    port = port ? port : 1883;
    browser.setValue('#node-config-input-port', port);
}

function clickOk() {
    browser.clickWithWait('#node-config-dialog-ok');
    // Wait until an config dialog closes.
    browser.waitForVisible('#node-config-dialog-ok', 2000, true);
}

function edit() {
    browser.clickWithWait('#node-input-lookup-broker');
    // Wait until a config dialog opens.
    browser.waitForVisible('#node-config-dialog-ok', 2000);
}

module.exports = {
    setServer: setServer,
    clickOk: clickOk,
    edit: edit
};
