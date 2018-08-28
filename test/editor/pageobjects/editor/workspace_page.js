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

 var when = require("when");

var events = require("../../../../red/runtime/events.js");

var palette = require("./palette_page");
var nodeFactory = require("../nodes/nodefactory_page");

function addNode(type, x, y) {
    var offsetX = x ? x : 0;
    var offsetY = y ? y : 0;
    browser.moveToObject(palette.getId(type));
    browser.buttonDown();
    browser.moveToObject("#palette-search", offsetX + 300, offsetY + 100); // adjust to the top-left corner of workspace.
    browser.buttonUp();
    // Last node is the one that has been created right now.
    var nodeElement = browser.elements('//*[@class="node nodegroup"][last()]');
    var nodeId = nodeElement.getAttribute('id');
    var node = nodeFactory.create(type, nodeId);
    return node;
}

function deleteAllNodes() {
    browser.click('.innerCanvas');
    browser.keys(['Control', 'a', 'a', 'Control']); // call twice to release the keys.
    browser.keys(['Delete']);
}

function deploy() {
    browser.call(function () {
        return when.promise(function(resolve, reject) {
            events.on("runtime-event", function(event) {
                if (event.id === 'runtime-deploy') {
                    resolve();
                }
            });
            browser.clickWithWait('#btn-deploy');
        });
    });
    browser.waitForText('#btn-deploy', 2000);
}

module.exports = {
    addNode: addNode,
    deleteAllNodes: deleteAllNodes,
    deploy: deploy
};
