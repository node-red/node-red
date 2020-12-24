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

var mqttBrokerNode = {};

mqttBrokerNode.setServer = function (broker, port) {
    browser.setValue('#node-config-input-broker', broker);
    port = port ? port : 1883;
    browser.setValue('#node-config-input-port', port);
};

mqttBrokerNode.clickOk = function () {
    browser.clickWithWait('#node-config-dialog-ok');
    // Wait until an config dialog closes.
    browser.waitForVisible('#node-config-dialog-ok', 10000, true);
};

mqttBrokerNode.edit = function () {
    browser.waitForVisible('#node-input-lookup-broker');
    browser.click('#node-input-lookup-broker');
    // Wait until a config dialog opens.
    browser.waitForVisible('#node-config-dialog-ok', 10000);
};

function mqttInNode(id) {
    nodePage.call(this, id);
}

util.inherits(mqttInNode, nodePage);

mqttInNode.prototype.setTopic = function (topic) {
    browser.setValue('#node-input-topic', topic);
};

mqttInNode.prototype.setQoS = function (qos) {
    browser.selectWithWait('#node-input-qos', qos);
};

mqttInNode.prototype.mqttBrokerNode = mqttBrokerNode;
module.exports.mqttInNode = mqttInNode;

function mqttOutNode(id) {
    nodePage.call(this, id);
}

util.inherits(mqttOutNode, nodePage);

mqttOutNode.prototype.setTopic = function (topic) {
    browser.setValue('#node-input-topic', topic);
};

mqttOutNode.prototype.setRetain = function (retain) {
    browser.selectWithWait('#node-input-retain', retain);
};

mqttOutNode.prototype.mqttBrokerNode = mqttBrokerNode;
module.exports.mqttOutNode = mqttOutNode;
