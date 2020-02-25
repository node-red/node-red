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
var should = require('should');
var fs = require('fs-extra');

var helper = require('../../editor_helper');
var debugTab = require('../../pageobjects/editor/debugTab_page');
var workspace = require('../../pageobjects/editor/workspace_page');
var specUtil = require('../../pageobjects/util/spec_util_page');

var httpNodeRoot = '/api';

// https://cookbook.nodered.org/
describe('cookbook', function () {
    beforeEach(function () {
        workspace.init();
    });

    before(function () {
        helper.startServer();
    });

    after(function () {
        helper.stopServer();
    });

    describe('HTTP requests', function () {
        it('simple get request', function () {
            var injectNode = workspace.addNode('inject');
            var httpRequestNode = workspace.addNode('httpRequest');
            var htmlNode = workspace.addNode('html');
            var debugNode = workspace.addNode('debug');

            httpRequestNode.edit();
            httpRequestNode.setMethod('GET');
            httpRequestNode.setUrl(helper.url());
            httpRequestNode.clickOk();

            htmlNode.edit();
            htmlNode.setSelector('title');
            htmlNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(htmlNode);
            htmlNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Node-RED"');
        });

        it('set the URL of a request', function () {
            var injectNode = workspace.addNode('inject');
            var changeNode = workspace.addNode('change');
            var httpRequestNode = workspace.addNode('httpRequest');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setPayload('str', helper.url());
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet('url', 'msg', 'payload', 'msg');
            changeNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.containEql('<title>Node-RED</title>');
        });

        it('set the URL of a request using a template', function () {
            var injectNode = workspace.addNode('inject');
            var changeNode = workspace.addNode('change');
            var httpRequestNode = workspace.addNode('httpRequest');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setPayload('str', 'settings');
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet('query', 'msg', 'payload', 'msg');
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + '/{{{query}}}');
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.containEql('httpNodeRoot');
        });

        it('set the query string parameters', function () {
            var injectNode = workspace.addNode('inject');
            var changeNode = workspace.addNode('change');
            var httpRequestNode = workspace.addNode('httpRequest');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setPayload('str', 'Nick');
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet('query', 'msg', 'payload', 'msg');
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/set-query?q={{{query}}}');
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);

            // The code for confirmation starts from here.
            var httpInNode = workspace.addNode('httpIn', 0, 200);
            var templateNode = workspace.addNode('template');
            var httpResponseNode = workspace.addNode('httpResponse');

            httpInNode.edit();
            httpInNode.setMethod('get');
            httpInNode.setUrl('/set-query');
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax('mustache');
            templateNode.setFormat('handlebars');
            templateNode.setTemplate('Hello {{req.query.q}}');
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello Nick"');
        });

        it('get a parsed JSON response', function () {
            var injectNode = workspace.addNode('inject');
            var changeNodeSetPost = workspace.addNode('change');
            var httpRequestNode = workspace.addNode('httpRequest');
            var debugNode = workspace.addNode('debug');

            injectNode.edit();
            injectNode.setPayload('str', 'json-response');
            injectNode.clickOk();

            changeNodeSetPost.edit();
            changeNodeSetPost.ruleSet('post', 'msg', 'payload', 'msg');
            changeNodeSetPost.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setMethod('GET');
            var url = helper.url() + httpNodeRoot + '/{{post}}';
            httpRequestNode.setUrl(url);
            httpRequestNode.setReturn('obj');
            httpRequestNode.clickOk();

            debugNode.edit();
            debugNode.setOutput('payload.title');
            debugNode.clickOk();

            injectNode.connect(changeNodeSetPost);
            changeNodeSetPost.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);

            // The code for confirmation starts from here.
            var httpInNode = workspace.addNode('httpIn', 0, 200);
            var templateNode = workspace.addNode('template');
            var changeNodeSetHeader = workspace.addNode('change');
            var httpResponseNode = workspace.addNode('httpResponse');

            httpInNode.edit();
            httpInNode.setMethod('get');
            httpInNode.setUrl('/json-response');
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax('mustache');
            templateNode.setFormat('handlebars');
            templateNode.setTemplate('{"title": "Hello"}');
            templateNode.clickOk();

            changeNodeSetHeader.edit();
            changeNodeSetHeader.ruleSet('headers', 'msg', '{"content-type":"application/json"}', 'json');
            changeNodeSetHeader.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(changeNodeSetHeader);
            changeNodeSetHeader.connect(httpResponseNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"Hello"');
        });

        it('get a binary response', function () {
            var injectNode = workspace.addNode('inject');
            var httpRequestNode = workspace.addNode('httpRequest');
            var debugNode = workspace.addNode('debug');

            httpRequestNode.edit();
            httpRequestNode.setMethod('GET');
            httpRequestNode.setUrl(helper.url() + '/settings');
            httpRequestNode.setReturn('bin');
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();

            debugTab.getMessage().should.eql(['123', '34', '104', '116', '116', '112', '78', '111', '100', '101']);
        });

        it('set a request header', function () {
            var injectNode = workspace.addNode('inject');
            var functionNode = workspace.addNode('function');
            var httpRequestNode = workspace.addNode('httpRequest');
            var debugNode = workspace.addNode('debug');

            functionNode.edit();
            functionNode.setFunction('msg.payload = "data to post";\nreturn msg;');
            functionNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setMethod('POST');
            var url = helper.url() + httpNodeRoot + '/set-header';
            httpRequestNode.setUrl(url);
            httpRequestNode.clickOk();

            injectNode.connect(functionNode);
            functionNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);

            // The code for confirmation starts from here.
            var httpInNode = workspace.addNode('httpIn', 0, 200);
            var templateNode = workspace.addNode('template');
            var httpResponseNode = workspace.addNode('httpResponse');

            httpInNode.edit();
            httpInNode.setMethod('post');
            httpInNode.setUrl('/set-header');
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax('mustache');
            templateNode.setFormat('handlebars');
            templateNode.setTemplate('{{ payload }}');
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"data to post"');
        });
    });
});
