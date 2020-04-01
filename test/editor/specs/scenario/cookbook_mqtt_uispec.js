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

var when = require('when');
var should = require("should");
var fs = require('fs-extra');

var helper = require("../../editor_helper");
var debugTab = require('../../pageobjects/editor/debugTab_page');
var workspace = require('../../pageobjects/editor/workspace_page');
var specUtil = require('../../pageobjects/util/spec_util_page');

var httpNodeRoot = "/api";

var mqttServer;
var mosca = require('mosca');
var moscaSettings = {
    port: parseInt(Math.random() * 16383 + 49152),
    persistence: {
        // Needs for retaining messages.
        factory: mosca.persistence.Memory
    }
};

// https://cookbook.nodered.org/
describe('cookbook', function () {
    beforeEach(function () {
        workspace.init();
    });

    before(function () {
        browser.call(function () {
            return new Promise(function (resolve, reject) {
                mqttServer = new mosca.Server(moscaSettings, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
        helper.startServer();
    });

    after(function () {
        browser.call(function () {
            return new Promise(function (resolve, reject) {
                mqttServer.close(function () {
                    resolve();
                });
            });
        });
        helper.stopServer();
    });

    describe('MQTT', function () {
        it('Add an MQTT broker to prepare for UI test', function () {
            var mqttOutNode = workspace.addNode("mqttOut");

            mqttOutNode.edit();
            mqttOutNode.mqttBrokerNode.edit();
            mqttOutNode.mqttBrokerNode.setServer("localhost", moscaSettings.port);
            mqttOutNode.mqttBrokerNode.clickOk();
            mqttOutNode.clickOk();

            workspace.deploy();
        });

        it('Connect to an MQTT broker', function () {
            var injectNode = workspace.addNode("inject");
            var mqttOutNode = workspace.addNode("mqttOut");

            var mqttInNode = workspace.addNode("mqttIn", 0, 100);
            var debugNode = workspace.addNode("debug");

            injectNode.edit();
            injectNode.setPayload("num", 22);
            injectNode.clickOk();

            mqttOutNode.edit();
            mqttOutNode.setTopic("sensors/livingroom/temp");
            mqttOutNode.clickOk();

            injectNode.connect(mqttOutNode);

            mqttInNode.edit();
            mqttInNode.setTopic("sensors/livingroom/temp");
            mqttInNode.setQoS("2");
            mqttInNode.clickOk();

            mqttInNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"22"');
        });

        // skip this case since it is same as other cases.
        it.skip('Publish messages to a topic');

        it('Set the topic of a published message', function () {
            var injectNode = workspace.addNode("inject");
            var mqttOutNode = workspace.addNode("mqttOut");

            injectNode.edit();
            injectNode.setPayload("num", 22);
            injectNode.setTopic("sensors/kitchen/temperature");
            injectNode.clickOk();

            mqttOutNode.edit();
            mqttOutNode.clickOk();

            injectNode.connect(mqttOutNode);

            // The code for confirmation starts from here.
            var mqttInNode = workspace.addNode("mqttIn", 0, 100);
            var debugNode = workspace.addNode("debug");

            mqttInNode.edit();
            mqttInNode.setTopic("sensors/kitchen/temperature");
            mqttInNode.clickOk();

            mqttInNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"22"');
        });

        it('Publish a retained message to a topic', function () {
            var injectNode = workspace.addNode("inject");
            var mqttOutNode = workspace.addNode("mqttOut");

            injectNode.edit();
            injectNode.setPayload("num", 22);
            injectNode.clickOk();

            mqttOutNode.edit();
            mqttOutNode.setTopic("sensors/livingroom/temp");
            mqttOutNode.setRetain("true");
            mqttOutNode.clickOk();

            injectNode.connect(mqttOutNode);

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();

            // The code for confirmation starts from here.
            var mqttInNode = workspace.addNode("mqttIn", 0, 100);
            var debugNode = workspace.addNode("debug");

            mqttInNode.edit();
            mqttInNode.setTopic("sensors/livingroom/temp");
            mqttInNode.clickOk();

            mqttInNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open(true);
            debugTab.getMessage().should.eql('"22"');
        });

        // skip this case since it is same as other cases.
        it.skip('Subscribe to a topic');

        it('Receive a parsed JSON message', function () {
            var injectNode = workspace.addNode("inject");
            var mqttOutNode = workspace.addNode("mqttOut");

            var mqttInNode = workspace.addNode("mqttIn", 0, 100);
            var jsonNode = workspace.addNode("json");
            var debugNode = workspace.addNode("debug");

            injectNode.edit();
            injectNode.setPayload("json", '{"sensor_id": 1234, "temperature": 13 }');
            injectNode.clickOk();

            mqttOutNode.edit();
            mqttOutNode.setTopic("sensors/livingroom/temp");
            mqttOutNode.clickOk();

            injectNode.connect(mqttOutNode);

            mqttInNode.edit();
            mqttInNode.setTopic("sensors/#");
            mqttInNode.setQoS("2");
            mqttInNode.clickOk();

            jsonNode.edit();
            jsonNode.setProperty("payload");
            jsonNode.clickOk();

            mqttInNode.connect(jsonNode);
            jsonNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql(['1234', '13']);
        });
    });
});
