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

var helper = require("../editor_helper");
var editWindow = require('../pageobjects/workspace/editWindow_page');
var debugTab = require('../pageobjects/workspace/debugTab_page');
var workspace = require('../pageobjects/workspace/workspace_page');

var nodeWidth = 200;

describe('Node-RED main page', function() {
    beforeEach(function() {
        workspace.deleteAllNodes();
    });

    before(function() {
        browser.windowHandleMaximize();
        browser.call(function () {
            return when.promise(function(resolve, reject) {
                helper.startServer(function() {
                    resolve();
                });
            });
        });
        browser.url(helper.url());
        browser.waitForExist('#palette_node_inject');
    });

    after(function() {
        browser.call(function () {
            return when.promise(function(resolve, reject) {
                helper.stopServer(function() {
                    resolve();
                });
            });
        });
    });

    it('should have a right title', function () {
        browser.getTitle().should.equal('Node-RED');
    });

    it('should output a timestamp', function() {
        var injectNode = workspace.addNode("inject");
        var debugNode = workspace.addNode("debug", nodeWidth);
        injectNode.connect(debugNode);

        workspace.deploy();

        debugTab.open();
        debugTab.clearMessage();
        injectNode.clickLeftButton();
        debugTab.getMessage().should.within(1500000000000, 3000000000000);
    });

    it('should set a message property to a fixed value', function() {
        var injectNode = workspace.addNode("inject");
        var changeNode = workspace.addNode("change", nodeWidth);
        var debugNode = workspace.addNode("debug", nodeWidth * 2);

        changeNode.edit();
        browser.setValue('.node-input-rule-property-value', 'Hello World!');
        editWindow.clickOk();

        injectNode.connect(changeNode);
        changeNode.connect(debugNode);

        workspace.deploy();

        debugTab.open();
        debugTab.clearMessage();
        injectNode.clickLeftButton();
        debugTab.getMessage().should.be.equal('"Hello World!"');
    });
});
