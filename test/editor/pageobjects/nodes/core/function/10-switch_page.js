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

function switchNode(id) {
    nodePage.call(this, id);
}

util.inherits(switchNode, nodePage);

var vtType = {
    "msg": 1,
    "flow": 2,
    "global": 3,
    "str": 4,
    "num": 5,
    "jsonata": 6,
    "env": 7,
    "prev": 8
};

function setT(t, index) {
    browser.selectWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/select', t);
}

function setV(v, vt, index) {
    if (vt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + vtType[vt] + ']');
    }
    if (v) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', v);
    }
}

function setBetweenV(v, vt, v2, v2t, index) {
    if (vt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + vtType[vt] + ']');
    }
    if (v) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div[2]/div[1]/input', v);
    }
    if (v2t) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[3]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + vtType[v2t] + ']');
    }
    if (v2) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[3]/div/div[1]/input', v2);
    }
}

function setSequenceV(v, vt, index) {
    var sType = {
        "flow": 1,
        "global": 2,
        "num": 3,
        "jsonata": 4,
        "env": 5,
    };

    if (vt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + sType[vt] + ']');
    }
    if (v) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div[2]/div[1]/input', v);
    }
}

switchNode.prototype.ruleEqual = function (v, vt, index) {
    index = index || 1;
    setT('eq', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleNotEqual = function (v, vt, index) {
    index = index || 1;
    setT('neq', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleLessThan = function (v, vt, index) {
    index = index || 1;
    setT('lt', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleLessThanOrEqual = function (v, vt, index) {
    index = index || 1;
    setT('lte', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleGreaterThan = function (v, vt, index) {
    index = index || 1;
    setT('gt', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleGreaterThanOrEqual = function (v, vt, index) {
    index = index || 1;
    setT('gte', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleHasKey = function (v, vt, index) {
    index = index || 1;
    setT('hask', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleIsBetween = function (v, vt, v2, v2t, index) {
    index = index || 1;
    setT('btwn', index);
    setBetweenV(v, vt, v2, v2t, index);
}

switchNode.prototype.ruleContains = function (v, vt, index) {
    index = index || 1;
    setT('cont', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleMatchesRegex = function (v, vt, index) {
    index = index || 1;
    setT('regex', index);
    setV(v, vt, index);
}

switchNode.prototype.ruleIsTrue = function (index) {
    index = index || 1;
    setT('true', index);
}

switchNode.prototype.ruleIsFalse = function (index) {
    index = index || 1;
    setT('false', index);
}

switchNode.prototype.ruleIsNull = function (index) {
    index = index || 1;
    setT('null', index);
}

switchNode.prototype.ruleIsNotNull = function (index) {
    index = index || 1;
    setT('nnull', index);
}

switchNode.prototype.ruleIsOfType = function (t, index) {
    index = index || 1;
    setT('istype', index);

    var tType = {
        "str": 1,
        "num": 2,
        "boolean": 3,
        "array": 4,
        "buffer": 5,
        "object": 6,
        "json": 7,
        "undefined": 8,
        "null": 9
    };

    if (t) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div[2]/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + tType[t] + ']');
    }
}

switchNode.prototype.ruleIsEmpty = function (index) {
    index = index || 1;
    setT('empty', index);
}

switchNode.prototype.ruleIsNotEmpty = function (index) {
    index = index || 1;
    setT('nempty', index);
}

switchNode.prototype.ruleHead = function (v, vt, index) {
    index = index || 1;
    setT('head', index);
    setSequenceV(v, vt, index);
}

switchNode.prototype.ruleIndexBetween = function (v, vt, v2, v2t, index) {
    index = index || 1;
    setT('index', index);
    setBetweenV(v, vt, v2, v2t, index);
}

switchNode.prototype.ruleTail = function (v, vt, index) {
    index = index || 1;
    setT('tail', index);
    setSequenceV(v, vt, index);
}

switchNode.prototype.ruleJSONataExp = function (v, index) {
    index = index || 1;
    setT('jsonata_exp', index);
    if (v) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div[2]/div[1]/input', v);
    }
}

switchNode.prototype.ruleOtherwise = function (index) {
    index = index || 1;
    setT('else', index);
}

switchNode.prototype.addRule = function () {
    browser.clickWithWait('//div[contains(@class, "red-ui-editableList")]/a');
}

module.exports = switchNode;
