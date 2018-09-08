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
var specUtil = require('../../pageobjects/util/spec_util_page');

var nodeWidth = 200;
var nodeHeight = 100;
var httpNodeRoot = "/api";

// https://cookbook.nodered.org/
describe('cookbook', function() {
    beforeEach(function() {
        workspace.deleteAllNodes();
    });

    before(function() {
        helper.startServer();
    });

    after(function() {
        helper.stopServer();
    });

    describe('messages', function() {
        it('set a message property to a fixed value', function() {
            var injectNode = workspace.addNode("inject");
            var changeNode = workspace.addNode("change", nodeWidth);
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            changeNode.edit();
            changeNode.ruleSet("payload", "msg", "Hello World!");
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello World!"');
        });

        it('delete a message property', function() {
            var injectNode = workspace.addNode("inject");
            var changeNode = workspace.addNode("change", nodeWidth);
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            changeNode.edit();
            changeNode.ruleDelete();
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql("undefined");
        });

        it('move a message property', function() {
            var injectNode = workspace.addNode("inject");
            var changeNode = workspace.addNode("change", nodeWidth);
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            injectNode.edit();
            injectNode.setTopic("Hello");
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleMove("topic", "payload");
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello"');
        });

        it('map a property between different numeric ranges', function() {
            var injectNode1 = workspace.addNode("inject");
            var injectNode2 = workspace.addNode("inject", 0, 50);
            var injectNode3 = workspace.addNode("inject", 0, 100);
            var rangeNode = workspace.addNode("range", nodeWidth);
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            injectNode1.edit();
            injectNode1.setPayload("num", 0);
            injectNode1.clickOk();
            injectNode2.edit();
            injectNode2.setPayload("num", 512);
            injectNode2.clickOk();
            injectNode3.edit();
            injectNode3.setPayload("num", 1023);
            injectNode3.clickOk();

            rangeNode.edit();
            rangeNode.setAction("clamp");
            rangeNode.setRange(0, 1023, 0, 5);
            rangeNode.clickOk();

            injectNode1.connect(rangeNode);
            injectNode2.connect(rangeNode);
            injectNode3.connect(rangeNode);
            rangeNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode1.clickLeftButton();
            debugTab.getMessage(1).should.eql('0');
            injectNode2.clickLeftButton();
            debugTab.getMessage(2).should.eql('2.5024437927663734');
            injectNode3.clickLeftButton();
            debugTab.getMessage(3).should.eql('5');
        });
    });

    describe('flow control', function() {
        it('trigger a flow whenever Node-RED starts', function() {
            var injectNode = workspace.addNode("inject");
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            injectNode.edit();
            injectNode.setPayload("str", "Started!")
            injectNode.setOnce(true);
            injectNode.clickOk();
            injectNode.connect(debugNode);

            debugTab.open();
            debugTab.clearMessage();
            workspace.deploy();
            debugTab.getMessage().should.eql('"Started!"');
        });

        it('trigger a flow at regular intervals', function() {
            var injectNode = workspace.addNode("inject");
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            injectNode.edit();
            injectNode.setRepeat("interval");
            injectNode.setRepeatInterval(1);
            injectNode.clickOk();
            injectNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            specUtil.pause(1000);
            var t1 = Number(debugTab.getMessage(1));
            t1.should.within(1500000000000, 3000000000000);
            specUtil.pause(1000);
            debugTab.getMessage(2).should.within(t1 + 1000, 3000000000000);
        });

        // skip this case since it needs up to one minite.
        it.skip('trigger a flow at a specific time');
    });

    describe('HTTP requests', function() {
        it('simple get request', function() {
            var injectNode = workspace.addNode("inject");
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth);
            var htmlNode = workspace.addNode("html", nodeWidth * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 3);

            httpRequetNode.edit();
            httpRequetNode.setMethod("GET");
            httpRequetNode.setUrl(helper.url());
            httpRequetNode.clickOk();

            htmlNode.edit();
            htmlNode.setSelector("title");
            htmlNode.clickOk();

            injectNode.connect(httpRequetNode);
            httpRequetNode.connect(htmlNode);
            htmlNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Node-RED"');
        });

        it('set the URL of a request', function() {
            var injectNode = workspace.addNode("inject");
            var changeNode = workspace.addNode("change", nodeWidth * 1.5);
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth * 2.5);
            var debugNode = workspace.addNode("debug", nodeWidth * 3.5);

            injectNode.edit();
            injectNode.setPayload("str", helper.url());
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("url", "msg", "payload", "msg");
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequetNode);
            httpRequetNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.containEql('<title>Node-RED</title>');
        });

        it('set the URL of a request using a template', function() {
            var injectNode = workspace.addNode("inject");
            var changeNode = workspace.addNode("change", nodeWidth * 1.5);
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth * 2.5);
            var debugNode = workspace.addNode("debug", nodeWidth * 3.5);

            injectNode.edit();
            injectNode.setPayload("str", 'settings');
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("query", "msg", "payload", "msg");
            changeNode.clickOk();

            httpRequetNode.edit();
            httpRequetNode.setUrl(helper.url() + "/{{{query}}}");
            httpRequetNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequetNode);
            httpRequetNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.containEql('httpNodeRoot');
        });

        it('set the query string parameters', function() {
            var injectNode = workspace.addNode("inject");
            var changeNode = workspace.addNode("change", nodeWidth);
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 3);

            injectNode.edit();
            injectNode.setPayload("str", 'Nick');
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("query", "msg", "payload", "msg");
            changeNode.clickOk();

            httpRequetNode.edit();
            httpRequetNode.setUrl(helper.url() + httpNodeRoot + '/set-query?q={{{query}}}');
            httpRequetNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequetNode);
            httpRequetNode.connect(debugNode);

            // The code for confirmation starts from here.
            var httpinNode = workspace.addNode("httpin", 0, nodeHeight);
            var templateNode = workspace.addNode("template", nodeWidth, nodeHeight);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 2, nodeHeight);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/set-query");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("Hello {{req.query.q}}");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello Nick"');
        });

        it('get a parsed JSON response', function() {
            var injectNode = workspace.addNode("inject");
            var changeNodeSetPost = workspace.addNode("change", nodeWidth);
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 3);

            injectNode.edit();
            injectNode.setPayload("str", "json-response");
            injectNode.clickOk();

            changeNodeSetPost.edit();
            changeNodeSetPost.ruleSet("post", "msg", "payload", "msg");
            changeNodeSetPost.clickOk();

            httpRequetNode.edit();
            httpRequetNode.setMethod("GET");
            var url = helper.url() + httpNodeRoot + "/{{post}}";
            httpRequetNode.setUrl(url);
            httpRequetNode.setReturn("obj");
            httpRequetNode.clickOk();

            debugNode.edit();
            debugNode.setOutput("payload.title");
            debugNode.clickOk();

            injectNode.connect(changeNodeSetPost);
            changeNodeSetPost.connect(httpRequetNode);
            httpRequetNode.connect(debugNode);

            // The code for confirmation starts from here.
            var httpinNode = workspace.addNode("httpin", 0, nodeHeight);
            var templateNode = workspace.addNode("template", nodeWidth * 1.5, nodeHeight);
            var changeNodeSetHeader = workspace.addNode("change", nodeWidth * 2.5, nodeHeight);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3.5, nodeHeight);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/json-response");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate('{"title": "Hello"}');
            templateNode.clickOk();

            changeNodeSetHeader.edit();
            changeNodeSetHeader.ruleSet("headers", "msg", '{"content-type":"application/json"}', "json");
            changeNodeSetHeader.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(changeNodeSetHeader);
            changeNodeSetHeader.connect(httpResponseNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello"');
        });

        it('get a binary response', function() {
            var injectNode = workspace.addNode("inject");
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth);
            var debugNode = workspace.addNode("debug", nodeWidth * 2);

            httpRequetNode.edit();
            httpRequetNode.setMethod("GET");
            httpRequetNode.setUrl(helper.url() + "/settings");
            httpRequetNode.setReturn("bin");
            httpRequetNode.clickOk();

            injectNode.connect(httpRequetNode);
            httpRequetNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();

            debugTab.getMessage().should.eql(['123', '34', '104', '116', '116', '112', '78', '111', '100', '101']);
        });

        it('set a request header', function() {
            var injectNode = workspace.addNode("inject");
            var functionNode = workspace.addNode("function", nodeWidth);
            var httpRequetNode = workspace.addNode("httpRequest", nodeWidth * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 3);

            functionNode.edit();
            functionNode.setFunction('msg.payload = "data to post";\nreturn msg;');
            functionNode.clickOk();

            httpRequetNode.edit();
            httpRequetNode.setMethod("POST");
            var url = helper.url() + httpNodeRoot + "/set-header";
            httpRequetNode.setUrl(url);
            httpRequetNode.clickOk();

            injectNode.connect(functionNode);
            functionNode.connect(httpRequetNode);
            httpRequetNode.connect(debugNode);

            // The code for confirmation starts from here.
            var httpinNode = workspace.addNode("httpin", 0, nodeHeight);
            var templateNode = workspace.addNode("template", nodeWidth * 1.5, nodeHeight);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 2.5, nodeHeight);

            httpinNode.edit();
            httpinNode.setMethod("post");
            httpinNode.setUrl("/set-header");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("{{ payload }}");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"data to post"');
        });
    });
});
