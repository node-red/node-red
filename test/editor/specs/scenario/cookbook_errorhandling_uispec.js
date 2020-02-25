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
        it('trigger a flow when a node throws an error', function () {
            var injectNode = workspace.addNode('inject');
            var functionNode = workspace.addNode('function');
            var catchNode = workspace.addNode('catch', 0 , 80);
            var debugNode = workspace.addNode('debug');

            functionNode.edit();
            functionNode.setFunction('node.error("an example error", msg);');
            functionNode.clickOk();

            catchNode.edit();
            catchNode.setScope(functionNode);
            catchNode.clickOk();

            debugNode.edit();
            debugNode.setOutput('error');
            debugNode.clickOk();

            injectNode.connect(functionNode);
            catchNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql(['"an example error"', 'function']);
        });

        // skip this case since the flow outputs random results.
        it.skip('automatically retry an action after an error');
    });
});
