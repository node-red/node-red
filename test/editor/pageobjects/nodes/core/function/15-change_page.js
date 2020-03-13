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

var util = require('util');

var nodePage = require('../../node_page');

function changeNode(id) {
    nodePage.call(this, id);
}

util.inherits(changeNode, nodePage);

var totType = {
    "msg": 1,
    "flow": 2,
    "global": 3,
    "str": 4,
    "num": 5,
    "bool": 6,
    "json": 7,
    "bin": 8,
    "date": 9,
    "jsonata": 10,
    "env": 11,
};

var ptType = {
    "msg": 1,
    "flow": 2,
    "global": 3,
};

function setT(t, index) {
    browser.selectWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/select', t);
}

// It is better to create a function whose input value is the object type in the future,
changeNode.prototype.ruleSet = function (p, pt, to, tot, index) {
    index = index || 1;
    setT('set', index);
    if (pt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + ptType[pt] + ']');
    }
    if (p) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', p);
    }
    if (tot) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[2]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + totType[tot] + ']');
    }
    if (to) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[2]/div[2]/div/input', to);
    }
}

changeNode.prototype.ruleChange = function (p, pt, from, fromt, to, tot, index) {
    index = index || 1;
    setT('change', index);
    if (pt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + ptType[pt] + ']');
    }
    if (p) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', p);
    }
    if (fromt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[3]/div[1]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + totType[pt] + ']');
    }
    if (from) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[3]/div[1]/div[2]/div[1]/input', from);
    }
    if (tot) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[3]/div[2]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + totType[pt] + ']');
    }
    if (to) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[3]/div[2]/div[2]/div[1]/input', to);
    }
}

changeNode.prototype.ruleDelete = function (p, pt, index) {
    index = index || 1;
    setT('delete', index);
    if (pt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + ptType[pt] + ']');
    }
    if (p) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', p);
    }
}

changeNode.prototype.ruleMove = function (p, pt, to, tot, index) {
    index = index || 1;
    setT('move', index);
    if (pt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + ptType[pt] + ']');
    }
    if (p) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', p);
    }
    if (tot) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[4]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + totType[pt] + ']');
    }
    if (to) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[4]/div[2]/div/input', to);
    }
}

changeNode.prototype.addRule = function () {
    browser.clickWithWait('//div[contains(@class, "red-ui-editableList")]/a');
}

module.exports = changeNode;
