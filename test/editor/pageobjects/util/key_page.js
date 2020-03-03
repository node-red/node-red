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

var os = require("os");

var shortCutKeyMap = {
    "selectAll": ['Control', 'a', 'a', 'Control'],
    "selectToEnd": ['Control', 'Shift', 'End', 'Shift', 'Control'],
};

var shortCutKeyMapForMac = {
    "selectAll": ['Command', 'a', 'a', 'Command'],
    "selectToEnd": ['Command', 'Shift', 'ArrowDown', 'Shift', 'Command'],
};

function getShortCutKey(type) {
    if (process.env.BROWSERSTACK) {
        if (browser.desiredCapabilities.os === 'OS X') {
            return shortCutKeyMapForMac[type];
        }
        return shortCutKeyMap[type];
    }
    if (os.type() === 'Darwin') {
        return shortCutKeyMapForMac[type];
    }
    return shortCutKeyMap[type];
}

function selectAll() {
    var key = getShortCutKey('selectAll');
    return key;
}

function selectToEnd() {
    var key = getShortCutKey('selectToEnd');
    return key;
}

module.exports = {
    selectAll: selectAll,
    selectToEnd: selectToEnd,
};
