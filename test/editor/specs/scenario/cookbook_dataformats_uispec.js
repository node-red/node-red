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

    describe('working with data formats', function () {
        it('convert to/from JSON', function () {
            var injectNode1 = workspace.addNode('inject');
            var jsonNode1 = workspace.addNode('json');
            var debugNode1 = workspace.addNode('debug');

            injectNode1.edit();
            injectNode1.setPayload('str', '{"a":1}');
            injectNode1.clickOk();

            jsonNode1.edit();
            jsonNode1.setProperty('payload');
            jsonNode1.clickOk();

            injectNode1.connect(jsonNode1);
            jsonNode1.connect(debugNode1);

            var injectNode2 = workspace.addNode('inject');
            var jsonNode2 = workspace.addNode('json');
            var debugNode2 = workspace.addNode('debug');

            injectNode2.edit();
            injectNode2.setPayload('json', '{"a":1}');
            injectNode2.clickOk();

            jsonNode2.edit();
            jsonNode2.setProperty('payload');
            jsonNode2.clickOk();

            injectNode2.connect(jsonNode2);
            jsonNode2.connect(debugNode2);

            workspace.deploy();

            debugTab.open();
            injectNode1.clickLeftButton();
            debugTab.getMessage().should.eql('1');
            debugTab.clearMessage();
            injectNode2.clickLeftButton();
            debugTab.getMessage().should.eql('"{"a":1}"');
        });

        it('convert to/from XML', function () {
            var injectNode1 = workspace.addNode('inject', 0);
            var templateNode1 = workspace.addNode('template', 200);
            var xmlNode1 = workspace.addNode('xml', 400);
            var debugNode1 = workspace.addNode('debug', 600);

            injectNode1.edit();
            injectNode1.setPayload('str', '{"a":1}');
            injectNode1.clickOk();

            templateNode1.edit();
            templateNode1.setFormat('text');
            templateNode1.setSyntax('plain');
            templateNode1.setTemplate('<note priority="high">'
                                    + '  <to>Nick</to>'
                                    + '  <from>Dave</from>'
                                    + '  <heading>Reminder</heading>'
                                    + '  <body>Update the website</body>'
                                    + '</note>');
            templateNode1.clickOk();

            xmlNode1.edit();
            xmlNode1.setProperty('payload');
            xmlNode1.clickOk();

            injectNode1.connect(templateNode1);
            templateNode1.connect(xmlNode1);
            xmlNode1.connect(debugNode1);

            var injectNode2 = workspace.addNode('inject');
            var xmlNode2 = workspace.addNode('xml');
            var debugNode2 = workspace.addNode('debug');

            injectNode2.edit();
            injectNode2.setPayload('json', '{'
                                         + '    "note": {'
                                         + '        "$": { "priority": "high" },'
                                         + '        "to": [ "Nick" ],'
                                         + '        "from": [ "Dave" ],'
                                         + '        "heading": [ "Reminder" ],'
                                         + '        "body": [ "Update the website" ]'
                                         + '    }'
                                         + '}');
            injectNode2.clickOk();

            xmlNode2.edit();
            xmlNode2.setProperty('payload');
            xmlNode2.clickOk();

            injectNode2.connect(xmlNode2);
            xmlNode2.connect(debugNode2);

            workspace.deploy();

            debugTab.open();
            injectNode1.clickLeftButton();
            debugTab.getMessage().should.eql('object');
            debugTab.clearMessage();
            injectNode2.clickLeftButton();
            debugTab.getMessage().should.eql('"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                                            + '<note priority="high">'
                                            + '<to>Nick</to>'
                                            + '<from>Dave</from>'
                                            + '<heading>Reminder</heading>'
                                            + '<body>Update the website</body>'
                                            + '</note>"');
        });

        it('convert to/from YAML', function () {
            var injectNode1 = workspace.addNode('inject', 0);
            var templateNode1 = workspace.addNode('template', 200);
            var yamlNode1 = workspace.addNode('yaml', 400);
            var debugNode1 = workspace.addNode('debug', 600);

            injectNode1.edit();
            injectNode1.setPayload('str', '{"a":1}');
            injectNode1.clickOk();

            templateNode1.edit();
            templateNode1.setFormat('yaml');
            templateNode1.setSyntax('plain');
            templateNode1.setTemplate('a: 1\n'
                                    + 'b:\n'
                                    + '  - 1\n'
                                    + '- 2\n'
                                    + '- 3');
            templateNode1.clickOk();

            yamlNode1.edit();
            yamlNode1.setProperty('payload');
            yamlNode1.clickOk();

            injectNode1.connect(templateNode1);
            templateNode1.connect(yamlNode1);
            yamlNode1.connect(debugNode1);

            var injectNode2 = workspace.addNode('inject');
            var yamlNode2 = workspace.addNode('yaml');
            var debugNode2 = workspace.addNode('debug');

            injectNode2.edit();
            injectNode2.setPayload('json', '{"a":1, "b":[1,2,3]}');
            injectNode2.clickOk();

            yamlNode2.edit();
            yamlNode2.setProperty('payload');
            yamlNode2.clickOk();

            injectNode2.connect(yamlNode2);
            yamlNode2.connect(debugNode2);

            workspace.deploy();

            debugTab.open();
            injectNode1.clickLeftButton();
            debugTab.getMessage().should.eql([ '1', 'array[3]' ]);
            debugTab.clearMessage();
            injectNode2.clickLeftButton();
            debugTab.getMessage().should.eql('"a: 1↵b:↵ - 1↵ - 2↵ - 3↵"');
        });

        it('generate CSV output', function () {
            var injectNode1 = workspace.addNode('inject', 0);
            var changeNode1 = workspace.addNode('change', 200);
            var csvNode1 = workspace.addNode('csv', 400);
            var debugNode1 = workspace.addNode('debug', 600);

            changeNode1.edit();
            changeNode1.ruleSet('payload', 'msg', '{'
                                                + '  "a": $floor(100*$random()),'
                                                + '  "b": $floor(100*$random()),'
                                                + '  "c": $floor(100*$random())'
                                                + '}', 'jsonata');
            changeNode1.clickOk();

            csvNode1.edit();
            csvNode1.setColumns('a,b,c');
            csvNode1.clickOk();

            injectNode1.connect(changeNode1);
            changeNode1.connect(csvNode1);
            csvNode1.connect(debugNode1);

            var injectNode2 = workspace.addNode('inject', 0, 80);
            var changeNode2 = workspace.addNode('change', 200, 80);
            var csvNode2 = workspace.addNode('csv', 400, 80);
            var debugNode2 = workspace.addNode('debug', 600, 80);

            changeNode2.edit();
            changeNode2.ruleSet('payload', 'msg', '['
                                                + '  {'
                                                + '    "a": $floor(100*$random()),'
                                                + '    "b": $floor(100*$random()),'
                                                + '    "c": $floor(100*$random())'
                                                + '  }, {'
                                                + '    "a": $floor(100*$random()),'
                                                + '    "b": $floor(100*$random()),'
                                                + '    "c": $floor(100*$random())'
                                                + '  }, {'
                                                + '    "a": $floor(100*$random()),'
                                                + '    "b": $floor(100*$random()),'
                                                + '    "c": $floor(100*$random())'
                                                + '  }, {'
                                                + '    "a": $floor(100*$random()),'
                                                + '    "b": $floor(100*$random()),'
                                                + '    "c": $floor(100*$random())'
                                                + '  }'
                                                + ']', 'jsonata');
            changeNode2.clickOk();

            csvNode2.edit();
            csvNode2.setColumns('a,b,c');
            csvNode2.setIncludeRow(true);
            csvNode2.clickOk();

            injectNode2.connect(changeNode2);
            changeNode2.connect(csvNode2);
            csvNode2.connect(debugNode2);

            workspace.deploy();

            debugTab.open();
            injectNode1.clickLeftButton();
            debugTab.getMessage().should.match(/^"([1-9]?[0-9],){2}[1-9]?[0-9]↵"$/);
            debugTab.clearMessage();
            injectNode2.clickLeftButton();
            debugTab.getMessage().should.match(/^"a,b,c↵(([1-9]?[0-9],){2}[1-9]?[0-9]↵){4}"$/);
        });

        it('parse CSV input', function () {
            var injectNode = workspace.addNode('inject');
            var templateNode = workspace.addNode('template');
            var csvNode = workspace.addNode('csv');
            var debugNode = workspace.addNode('debug');

            templateNode.edit();
            templateNode.setFormat('handlebars');
            templateNode.setSyntax('mustache');
            templateNode.setTemplate('# This is some random data\n'
                                   + 'a,b,c\n'
                                   + '80,18,2\n'
                                   + '52,36,10\n'
                                   + '91,18,61\n'
                                   + '32,47,65');
            templateNode.clickOk();

            csvNode.edit();
            csvNode.setSkipLines(1);
            csvNode.setFirstRow4Names(true);
            csvNode.setOutput('mult');
            csvNode.clickOk();

            injectNode.connect(templateNode);
            templateNode.connect(csvNode);
            csvNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql([ 'object', 'object', 'object', 'object' ]);
        });

        it('simple GET request', function () {
            var injectNode = workspace.addNode('inject');
            var httpRequestNode = workspace.addNode('httpRequest');
            var htmlNode = workspace.addNode('html');
            var debugNode = workspace.addNode('debug');

            httpRequestNode.edit();
            httpRequestNode.setMethod('GET');
            httpRequestNode.setUrl('https://nodered.org');
            httpRequestNode.clickOk();

            htmlNode.edit();
            htmlNode.setSelector('.node-red-latest-version');
            htmlNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(htmlNode);
            htmlNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.match(/^"v[0-9]+\.[0-9]+\.[0-9]"$/);
        });

        it('split text into one message per line', function () {
            var injectNode = workspace.addNode('inject');
            var templateNode = workspace.addNode('template');
            var splitNode = workspace.addNode('split');
            var changeNode = workspace.addNode('change');
            var joinNode = workspace.addNode('join');
            var debugNode = workspace.addNode('debug');

            templateNode.edit();
            templateNode.setFormat('handlebars');
            templateNode.setSyntax('mustache');
            templateNode.setTemplate('one\ntwo\nthree\nfour\nfive');
            templateNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet('payload', 'msg', '(parts.index+1) & ": " & payload', 'jsonata');
            changeNode.clickOk();

            injectNode.connect(templateNode);
            templateNode.connect(splitNode);
            splitNode.connect(changeNode);
            changeNode.connect(joinNode);
            joinNode.connect(debugNode);

            workspace.deploy();

            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().should.eql('"1: one↵2: two↵3: three↵4: four↵5: five"');
        });
    });
});
