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

var should = require("should");

var helper = require("../../editor_helper");
var debugTab = require('../../pageobjects/editor/debugTab_page');
var workspace = require('../../pageobjects/editor/workspace_page');

var httpNodeRoot = "/api";

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

    describe('HTTP endpoints', function () {
        it('create an HTTP endpoint', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello World!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello World!').should.not.eql(-1);
        });

        it('handle query parameters passed to an HTTP endpoint', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello-query");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{req.query.name}}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-query?name=Nick');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('handle url parameters in an HTTP endpoint', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello-param/:name");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{req.params.name}}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-param/Dave');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Dave!').should.not.eql(-1);
        });

        it('access HTTP request headers', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello-headers");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>User agent: {{req.headers.user-agent}}</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, 100);
            var changeNode = workspace.addNode("change");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", '{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}', "json");
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-headers');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Mozilla').should.not.eql(-1);
        });

        it('include data captured in another flow', function () {
            var injectNodeTimestamp = workspace.addNode("inject");
            var changeNodeStore = workspace.addNode("change");

            var httpInNode = workspace.addNode("httpIn", 0, 100);
            var changeNodeCopy = workspace.addNode("change");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            injectNodeTimestamp.edit();
            injectNodeTimestamp.setPayload("date");
            injectNodeTimestamp.clickOk();

            changeNodeStore.edit();
            changeNodeStore.ruleSet("timestamp", "flow", "payload", "msg");
            changeNodeStore.clickOk();

            injectNodeTimestamp.connect(changeNodeStore);

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello-data");
            httpInNode.clickOk();

            changeNodeCopy.edit();
            changeNodeCopy.ruleSet("timestamp", "msg", "timestamp", "flow");
            changeNodeCopy.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Time: {{ timestamp }}</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(changeNodeCopy);
            changeNodeCopy.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNodeCheck = workspace.addNode("inject", 0, 300);
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            httpRequestNode.edit();
            httpRequestNode.setMethod("GET");
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-data');
            httpRequestNode.clickOk();

            injectNodeCheck.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNodeTimestamp.clickLeftButton();
            injectNodeCheck.clickLeftButton();
            var index = debugTab.getMessage().indexOf('Time: ') + 6;
            debugTab.getMessage().substring(index, index + 13).should.within(1500000000000, 3000000000000);
        });

        it('serve JSON content', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var changeNode = workspace.addNode("change");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello-json");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate('{ "Hello": "World" }');
            templateNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", "{}", "json", "1");
            changeNode.addRule();
            changeNode.ruleSet("headers.content-type", "msg", "application/json", "str", "2");
            changeNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(changeNode);
            changeNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, 200);
            var httpRequestNode = workspace.addNode("httpRequest");
            var changeNodeCheck = workspace.addNode("change");
            var debugNode = workspace.addNode("debug");

            httpRequestNode.edit();
            httpRequestNode.setMethod("GET");
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-json');
            httpRequestNode.clickOk();

            changeNodeCheck.edit();
            changeNodeCheck.ruleSet("payload", "msg", "headers.content-type", "msg", "1");
            changeNodeCheck.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(changeNodeCheck);
            changeNodeCheck.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            var messages = debugTab.getMessage();
            messages.indexOf('application/json').should.not.eql(-1);
        });

        it('serve a local file', function () {
            var httpInNode = workspace.addNode("httpIn");
            var fileInNode = workspace.addNode("fileIn");
            var changeNode = workspace.addNode("change", 200, 100);
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("get");
            httpInNode.setUrl("/hello-file");
            httpInNode.clickOk();

            fileInNode.edit();
            fileInNode.setFilename("test/resources/file-in-node/test.txt");
            fileInNode.setOutput("");
            fileInNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", "{}", "json");
            changeNode.addRule();
            changeNode.ruleSet("headers.content-type", "msg", "text/plain", "str", "2");
            changeNode.clickOk();

            httpInNode.connect(fileInNode);
            fileInNode.connect(changeNode);
            changeNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, 200);
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-file');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Text file').should.not.eql(-1);
        });

        it('post raw data to a flow', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("post");
            httpInNode.setUrl("/hello-raw");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{ payload }}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            injectNode.edit();
            injectNode.setPayload("str", "Nick");
            injectNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-raw');
            httpRequestNode.setMethod("POST");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('post form data to a flow', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("post");
            httpInNode.setUrl("/hello-form");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{ payload.name }}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, 100);
            var changeNode = workspace.addNode("change");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            injectNode.edit();
            injectNode.setPayload("str", "name=Nick");
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", '{"content-type":"application/x-www-form-urlencoded"}', "json");
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-form');
            httpRequestNode.setMethod("POST");
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('post JSON data to a flow', function () {
            var httpInNode = workspace.addNode("httpIn");
            var templateNode = workspace.addNode("template");
            var httpResponseNode = workspace.addNode("httpResponse");

            httpInNode.edit();
            httpInNode.setMethod("post");
            httpInNode.setUrl("/hello-json");
            httpInNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{ payload.name }}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpInNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, 100);
            var changeNode = workspace.addNode("change");
            var httpRequestNode = workspace.addNode("httpRequest");
            var debugNode = workspace.addNode("debug");

            injectNode.edit();
            injectNode.setPayload("json", '{"name":"Nick"}');
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", '{"content-type":"application/json"}', "json");
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-json');
            httpRequestNode.setMethod("POST");
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('work with cookies', function () {
            var httpInNodeFormat = workspace.addNode("httpIn");
            var functionNodeFormat = workspace.addNode("function", 240);
            var templateNode = workspace.addNode("template", 400);
            var httpResponseNode = workspace.addNode("httpResponse", 600);

            var httpInNodeAdd = workspace.addNode("httpIn", 0, 100);
            var functionNodeAdd = workspace.addNode("function", 240);
            var changeNode = workspace.addNode("change", 400);

            var httpInNodeClear = workspace.addNode("httpIn", 0, 200);
            var functionNodeClear = workspace.addNode("function", 250);

            httpInNodeFormat.edit();
            httpInNodeFormat.setMethod("get");
            httpInNodeFormat.setUrl("/hello-cookie");
            httpInNodeFormat.clickOk();

            functionNodeFormat.edit();
            functionNodeFormat.setFunction("msg.payload = JSON.stringify(msg.req.cookies,null,4);\nreturn msg;");
            functionNodeFormat.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate('<html>\n<head></head>\n<body>\n<h1>Cookies</h1>\n<p></p><a href="hello-cookie/add">Add a cookie</a> &bull; <a href="hello-cookie/clear">Clear cookies</a></p>\n<pre>{{ payload }}</pre>\n</body>\n</html>');
            templateNode.clickOk();

            httpInNodeFormat.connect(functionNodeFormat);
            functionNodeFormat.connect(templateNode);
            templateNode.connect(httpResponseNode);

            httpInNodeAdd.edit();
            httpInNodeAdd.setMethod("get");
            httpInNodeAdd.setUrl("/hello-cookie/add");
            httpInNodeAdd.clickOk();

            functionNodeAdd.edit();
            functionNodeAdd.setFunction('msg.cookies = { };\n msg.cookies["demo-"+(Math.floor(Math.random()*1000))] = Date.now();\nreturn msg;');
            functionNodeAdd.clickOk();

            changeNode.edit();
            changeNode.ruleSet("statusCode", "msg", "302", "num");
            changeNode.addRule();
            changeNode.ruleSet("headers", "msg", "{}", "json", "2");
            changeNode.addRule();
            changeNode.ruleSet("headers.location", "msg", httpNodeRoot + "/hello-cookie", "str", "3");
            changeNode.clickOk();

            httpInNodeAdd.connect(functionNodeAdd);
            functionNodeAdd.connect(changeNode);
            changeNode.connect(httpResponseNode);

            httpInNodeClear.edit();
            httpInNodeClear.setMethod("get");
            httpInNodeClear.setUrl("/hello-cookie/clear");
            httpInNodeClear.clickOk();

            functionNodeClear.edit();
            functionNodeClear.setFunction("var cookieNames = Object.keys(msg.req.cookies).filter(function(cookieName) { return /^demo-/.test(cookieName);});\nmsg.cookies = {};\n\ncookieNames.forEach(function(cookieName) {\n    msg.cookies[cookieName] = null;\n});\nreturn msg;\n");
            functionNodeClear.clickOk();

            httpInNodeClear.connect(functionNodeClear);
            functionNodeClear.connect(changeNode);

            workspace.deploy();
            // This case cannot be checked since http request node does not transfer cookies when redirected.
        });
    });
});
