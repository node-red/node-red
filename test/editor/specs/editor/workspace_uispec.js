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


describe('Workspace', function() {
    beforeEach(function() {
        workspace.init();
    });

    before(function() {
        helper.startServer();
    });

    after(function() {
        helper.stopServer();
    });

    it('should have a right title', function () {
        browser.getTitle().should.startWith('Node-RED');
    });

    it('should output a timestamp', function() {
        var injectNode = workspace.addNode("inject");
        var debugNode = workspace.addNode("debug");
        injectNode.connect(debugNode);

        workspace.deploy();

        debugTab.open();
        injectNode.clickLeftButton();
        debugTab.getMessage().should.within(1500000000000, 3000000000000);
    });

});
