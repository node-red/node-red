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

var websocketListenerNode = {};

websocketListenerNode.setPath = function (path) {
    browser.setValue('#node-config-input-path', path);
};

websocketListenerNode.setSendReceive = function (wholemsg) {
    browser.selectWithWait('#node-config-input-wholemsg', wholemsg);
};

websocketListenerNode.clickOk = function () {
    browser.clickWithWait('#node-config-dialog-ok');
    // Wait until an config dialog closes.
    browser.waitForVisible('#node-config-dialog-ok', 10000, true);
};

websocketListenerNode.edit = function () {
    browser.waitForVisible('#node-input-lookup-server');
    browser.click('#node-input-lookup-server');
    // Wait until a config dialog opens.
    browser.waitForVisible('#node-config-dialog-ok', 10000);
};

var websocketClientNode = {};

websocketClientNode.setPath = function (path) {
    browser.setValue('#node-config-input-path', path);
};

websocketClientNode.setSendReceive = function (wholemsg) {
    browser.selectWithWait('#node-config-input-wholemsg', wholemsg);
};

websocketClientNode.clickOk = function () {
    browser.clickWithWait('#node-config-dialog-ok');
    // Wait until an config dialog closes.
    browser.waitForVisible('#node-config-dialog-ok', 10000, true);
};

websocketClientNode.edit = function () {
    browser.waitForVisible('#node-input-lookup-client');
    browser.click('#node-input-lookup-client');
    // Wait until a config dialog opens.
    browser.waitForVisible('#node-config-dialog-ok', 10000);
};

function websocketInNode(id) {
    nodePage.call(this, id);
}

util.inherits(websocketInNode, nodePage);

websocketInNode.prototype.setType = function (type) {
    browser.selectWithWait('#node-input-mode', type);
};

websocketInNode.prototype.websocketListenerNode = websocketListenerNode;
websocketInNode.prototype.websocketClientNode = websocketClientNode;
module.exports.websocketInNode = websocketInNode;

function websocketOutNode(id) {
    nodePage.call(this, id);
}

util.inherits(websocketOutNode, nodePage);

websocketOutNode.prototype.setType = function (type) {
    browser.selectWithWait('#node-input-mode', type);
};

websocketOutNode.prototype.websocketListenerNode = websocketListenerNode;
websocketOutNode.prototype.websocketClientNode = websocketClientNode;
module.exports.websocketOutNode = websocketOutNode;
