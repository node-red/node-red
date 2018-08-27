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

var util = require("util");

var nodePage = require("../../node_page");

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
changeNode.prototype.ruleSet = function(p, pt, to, tot, index) {
    index = index ? index : 1;
    setT("set", index);
    if (pt) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/button[1]');
        var num = 5 * index + 6;
        var ptXPath = '/html/body/div[' + num + ']/a[' + ptType[pt] + ']';
        browser.clickWithWait(ptXPath);
    }
    if (p) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', p);
    }
    if (tot) {
        browser.clickWithWait('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[2]/div[2]/button[1]');
        var num = 5 * index + 7;
        var totXPath = '/html/body/div[' + num + ']/a[' + totType[tot] + ']';
        browser.clickWithWait(totXPath);
    }
    if (to) {
        browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[2]/div[2]/div/input' , to);
    }
}

changeNode.prototype.ruleDelete = function(index) {
    index = index ? index : 1;
    setT("delete", index);
}

changeNode.prototype.ruleMove = function(p, to, index) {
    index = index ? index : 1;
    setT("move", index);
    browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[1]/div/div/input', p);
    browser.setValue('//*[@id="node-input-rule-container"]/li[' + index + ']/div/div[4]/div[2]/div/input', to);
}

changeNode.prototype.addRule = function() {
    browser.clickWithWait('//*[@id="dialog-form"]/div[3]/div/a');
}

module.exports = changeNode;
