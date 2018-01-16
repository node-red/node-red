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

var events = require("../../../../red/runtime/events.js");

var node = require('./node_page');

var palette = {
    "inject": "#palette_node_inject",
    "debug": "#palette_node_debug",
    "change": "#palette_node_change",
};

function addNode(type, x, y) {
    var offsetX = x ? x : 0;
    var offsetY = y ? y : 0;
    browser.moveToObject(palette[type]);
    browser.buttonDown();
    browser.moveToObject("#palette-search", offsetX + 300, offsetY + 100); // adjust to the top-left corner of workspace.
    browser.buttonUp();
    return new node(type);
}

function deleteAllNodes() {
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
            browser.click('#btn-deploy');
        });
    });
    browser.pause(500); // Necessary for headless mode.
}

module.exports = {
    addNode: addNode,
    deleteAllNodes: deleteAllNodes,
    deploy: deploy
};
