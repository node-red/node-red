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
var should = require('should');
var fs = require('fs-extra');

var helper = require('../../editor_helper');
var debugTab = require('../../pageobjects/editor/debugTab_page');
var workspace = require('../../pageobjects/editor/workspace_page');
var specUtil = require('../../pageobjects/util/spec_util_page');

var httpNodeRoot = '/api';

// https://cookbook.nodered.org/
describe('cookbook', function () {
    beforeEach(function () {
        workspace.init();
    });

    before(function () {
        helper.startServer();
    });

    after(function () {
        helper.stopServer();
    });

    describe('messages', function () {
        it('set a message property to a fixed value', function () {
            var injectNode = workspace.addNode('inject');
            var changeNode = workspace.addNode('change');
            var debugNode = workspace.addNode('debug');

            changeNode.edit();
            changeNode.ruleSet('payload', 'msg', 'Hello World!');
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello World!"');
        });

        it('delete a message property', function () {
            var injectNode = workspace.addNode('inject');
            var changeNode = workspace.addNode('change');
            var debugNode = workspace.addNode('debug');

            changeNode.edit();
            changeNode.ruleDelete();
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('undefined');
        });

        it('move a message property', function () {
            var injectNode = workspace.addNode('inject');
            var changeNode = workspace.addNode('change');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setTopic('Hello');
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleMove('topic', 'msg', 'payload', 'msg');
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello"');
        });

        it('map a property between different numeric ranges', function () {
            var injectNode1 = workspace.addNode('inject');
            var injectNode2 = workspace.addNode('inject', 0, 100);
            var injectNode3 = workspace.addNode('inject', 0, 200);
            var rangeNode = workspace.addNode('range', 200, 100);
            var debugNode = workspace.addNode('debug', 400);

            injectNode1.edit();
            injectNode1.setPayload('num', 0);
            injectNode1.clickOk();
            injectNode2.edit();
            injectNode2.setPayload('num', 512);
            injectNode2.clickOk();
            injectNode3.edit();
            injectNode3.setPayload('num', 1023);
            injectNode3.clickOk();

            rangeNode.edit();
            rangeNode.setAction('clamp');
            rangeNode.setRange(0, 1023, 0, 5);
            rangeNode.clickOk();

            injectNode1.connect(rangeNode);
            injectNode2.connect(rangeNode);
            injectNode3.connect(rangeNode);
            rangeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode1.clickLeftButton();
            debugTab.getMessage(1).should.eql('0');
            injectNode2.clickLeftButton();
            debugTab.getMessage(2).should.eql('2.5024437927663734');
            injectNode3.clickLeftButton();
            debugTab.getMessage(3).should.eql('5');
        });
    });
});
