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

function triggerNode(id) {
    nodePage.call(this, id);
}

util.inherits(triggerNode, nodePage);

triggerNode.prototype.setSend = function (send, sendt) {
    var sendType = {
        "flow": 1,
        "global": 2,
        "str": 3,
        "num": 4,
        "bool": 5,
        "json": 6,
        "bin": 7,
        "date": 8,
        "env": 9,
        "pay": 10,
        "nul": 11
    };

    if (sendt) {
        browser.clickWithWait('//*[@id="dialog-form"]/div[1]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + sendType[sendt] + ']');
    }
    if (send) {
        browser.setValue('//*[@id="dialog-form"]/div[1]/div/div[1]/input', send);
    }
}

triggerNode.prototype.setDuration = function (duration, units) {
    browser.setValue('//*[@id="node-input-duration"]', duration);
    if (units) {
        browser.selectWithWait('//*[@id="node-input-units"]', units);
    }
}

triggerNode.prototype.setThenSend = function (thenSend, thenSendt) {
    var thenSendType = {
        "flow": 1,
        "global": 2,
        "str": 3,
        "num": 4,
        "bool": 5,
        "json": 6,
        "bin": 7,
        "date": 8,
        "env": 9,
        "pay": 10,
        "payl": 11,
        "nul": 12
    };

    if (thenSendt) {
        browser.clickWithWait('//*[@id="dialog-form"]/div[5]/div/button[1]');
        browser.clickWithWait('//div[contains(@class, "red-ui-typedInput-options") and not(contains(@style, "display: none"))]/a[' + thenSendType[thenSendt] + ']');
    }
    if (thenSend) {
        browser.setValue('//*[@id="dialog-form"]/div[5]/div/div[1]/input', thenSend);
    }
}

module.exports = triggerNode;
