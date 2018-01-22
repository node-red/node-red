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

function Node(id) {
    this.id = '//*[@id="' + id + '"]';
}

Node.prototype.edit = function() {
    browser.clickWithWait(this.id);
    browser.clickWithWait(this.id);
    // Wait until an edit dialog opens.
    browser.waitForVisible('#node-dialog-ok', 2000);
}

Node.prototype.clickOk = function() {
    browser.clickWithWait('#node-dialog-ok');
    // Wait untile an edit dialog closes.
    browser.waitForVisible('#node-dialog-ok', 2000, true);
}

Node.prototype.connect = function(targetNode) {
    var outputPort = this.id + '/*[@class="port_output"]';
    var inputPort = targetNode.id + '/*[@class="port_input"]';
    browser.dragAndDrop(outputPort, inputPort)
}

Node.prototype.clickLeftButton = function() {
    browser.clickWithWait(this.id + '/*[@class="node_button node_left_button"]');
}

module.exports = Node;
