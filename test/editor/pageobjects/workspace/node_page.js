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

var icons = {
    // input
    "inject": "icons/node-red/inject.png",
    // output
    "debug": "icons/node-red/debug.png",
    // function
    "change": "icons/node-red/swap.png",
};

function getIdWithIcon(icon) {
    //*[name()="image" and @*="icons/node-red/inject.png"]/../..
    var id = browser.getAttribute('//*[name()="image" and @*="' + icon + '"]/../..', 'id');
    return id;
}

function Node(type) {
    this.id = '//*[@id="' + getIdWithIcon(icons[type]) + '"]';
}

Node.prototype.edit = function() {
    browser.click(this.id);
    browser.click(this.id);
    browser.pause(500); // Necessary for headless mode.
}

Node.prototype.connect = function(targetNode) {
    var outputPort = this.id + '/*[@class="port_output"]';
    var inputPort = targetNode.id + '/*[@class="port_input"]';
    browser.dragAndDrop(outputPort, inputPort)
}

Node.prototype.clickLeftButton = function() {
    browser.click(this.id + '/*[@class="node_button node_left_button"]');
}

module.exports = Node;
