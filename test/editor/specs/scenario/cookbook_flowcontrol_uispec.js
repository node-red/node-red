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

    describe('flow control', function () {
        it('trigger a flow whenever Node-RED starts', function () {
            var injectNode = workspace.addNode('inject');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setPayload('str', 'Started!');
            injectNode.setOnce(true);
            injectNode.clickOk();
            injectNode.connect(debugNode);

            debugTab.open();
            workspace.deploy();
            debugTab.getMessage().should.eql('"Started!"');
        });

        it('trigger a flow at regular intervals', function () {
            var injectNode = workspace.addNode('inject');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setRepeat('interval');
            injectNode.setRepeatInterval(1);
            injectNode.clickOk();
            injectNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            specUtil.pause(1000);
            var t1 = Number(debugTab.getMessage(1));
            t1.should.within(1500000000000, 3000000000000);
            specUtil.pause(1000);
            debugTab.getMessage(2).should.within(t1 + 900, 3000000000000);
        });

        // skip this case since it needs up to one minite.
        it.skip('trigger a flow at a specific time');
    });
});
