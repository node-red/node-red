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
var events = require("../../../red/runtime/events.js");


describe('Node-RED main page', function() {
    before(function() {
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
        browser.moveToObject('#palette_node_inject');
        browser.buttonDown();
        browser.moveToObject('#palette_node_inject', 300, 50);
        browser.buttonUp();

        browser.moveToObject('#palette_node_debug');
        browser.buttonDown();
        browser.moveToObject('#palette_node_debug', 300, -50);
        browser.buttonUp();

        browser.moveToObject('.port_output');
        browser.buttonDown();
        browser.moveToObject('.port_input');
        browser.buttonUp();

        browser.click('#btn-deploy');
        browser.call(function () {
            return when.promise(function(resolve, reject) {
                events.on("runtime-event", function(event) {
                    if (event.id === 'runtime-deploy') {
                        resolve();
                    }
                });
            });
        });
        // need additional wait to click on workspace.
        browser.pause(500);

        browser.click('#red-ui-tab-debug');
        browser.click('.node_left_button');
        browser.waitForExist('.debug-message-type-number');
        browser.getText('.debug-message-type-number').should.within(1500000000000, 3000000000000);
    });
});
