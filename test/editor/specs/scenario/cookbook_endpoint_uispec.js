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

    describe('HTTP endpoints', function () {
        it('create an HTTP endpoint', function () {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 2);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello World!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight);

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello World!').should.not.eql(-1);
        });

        it('handle query parameters passed to an HTTP endpoint', function () {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 2);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-query");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{req.query.name}}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight);

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-query?name=Nick');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('handle url parameters in an HTTP endpoint', function () {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth * 2);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-param/:name");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{req.params.name}}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight);

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-param/Dave');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Dave!').should.not.eql(-1);
        });

        it('access HTTP request headers', function () {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth * 1.5);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 2.5);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-headers");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>User agent: {{req.headers.user-agent}}</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var changeNode = workspace.addNode("change", nodeWidth, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth * 2, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 3, nodeHeight);

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
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Mozilla').should.not.eql(-1);
        });

        it('include data captured in another flow', function () {
            var injectNodeTimestamp = workspace.addNode("inject");
            var changeNodeStore = workspace.addNode("change", nodeWidth);

            var httpinNode = workspace.addNode("httpin", 0, nodeHeight);
            var changeNodeCopy = workspace.addNode("change", nodeWidth * 2, nodeHeight);
            var templateNode = workspace.addNode("template", nodeWidth * 3, nodeHeight);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 4, nodeHeight);

            injectNodeTimestamp.edit();
            injectNodeTimestamp.setPayload("date");
            injectNodeTimestamp.clickOk();

            changeNodeStore.edit();
            changeNodeStore.ruleSet("timestamp", "flow", "payload", "msg");
            changeNodeStore.clickOk();

            injectNodeTimestamp.connect(changeNodeStore);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-data");
            httpinNode.clickOk();

            changeNodeCopy.edit();
            changeNodeCopy.ruleSet("timestamp", "msg", "timestamp", "flow");
            changeNodeCopy.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Time: {{ timestamp }}</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(changeNodeCopy);
            changeNodeCopy.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNodeCheck = workspace.addNode("inject", 0, nodeHeight * 2);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight * 2);

            httpRequestNode.edit();
            httpRequestNode.setMethod("GET");
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-data');
            httpRequestNode.clickOk();

            injectNodeCheck.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNodeTimestamp.clickLeftButton();
            injectNodeCheck.clickLeftButton();
            var index = debugTab.getMessage().indexOf('Time: ') + 6;
            debugTab.getMessage().substring(index, index + 13).should.within(1500000000000, 3000000000000);
        });

        it('serve JSON content', function () {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth);
            var changeNode = workspace.addNode("change", nodeWidth * 2);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-json");
            httpinNode.clickOk();

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

            httpinNode.connect(templateNode);
            templateNode.connect(changeNode);
            changeNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight);

            httpRequestNode.edit();
            httpRequestNode.setMethod("GET");
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-json');
            httpRequestNode.clickOk();

            debugNode.edit();
            debugNode.setOutput("headers");
            debugNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            var message = debugTab.getMessage();
            message[1].indexOf('application/json').should.not.eql(-1);
        });

        it('serve a local file', function () {
            var httpinNode = workspace.addNode("httpin");
            var fileinNode = workspace.addNode("filein", nodeWidth);
            var changeNode = workspace.addNode("change", nodeWidth * 2, nodeHeight);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3.5, nodeHeight);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-file");
            httpinNode.clickOk();

            fileinNode.edit();
            fileinNode.setFilename("test/resources/file-in-node/test.txt");
            fileinNode.setOutput("");
            fileinNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", "{}", "json");
            changeNode.addRule();
            changeNode.ruleSet("headers.content-type", "msg", "text/plain", "str", "2");
            changeNode.clickOk();

            httpinNode.connect(fileinNode);
            fileinNode.connect(changeNode);
            changeNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight * 2);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight * 2);

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-file');
            httpRequestNode.setMethod("GET");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Text file').should.not.eql(-1);
        });

        it('post raw data to a flow', function() {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth * 2);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3);

            httpinNode.edit();
            httpinNode.setMethod("post");
            httpinNode.setUrl("/hello-raw");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{ payload }}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight);

            injectNode.edit()
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
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('post form data to a flow', function () {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth * 1.5);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 2.5);

            httpinNode.edit();
            httpinNode.setMethod("post");
            httpinNode.setUrl("/hello-form");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{ payload.name }}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var changeNode = workspace.addNode("change", nodeWidth, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth * 2, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 3, nodeHeight);

            injectNode.edit()
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
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('post JSON data to a flow', function() {
            var httpinNode = workspace.addNode("httpin");
            var templateNode = workspace.addNode("template", nodeWidth * 2);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3);

            httpinNode.edit();
            httpinNode.setMethod("post");
            httpinNode.setUrl("/hello-json");
            httpinNode.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Hello {{ payload.name }}!</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode = workspace.addNode("inject", 0, nodeHeight);
            var changeNode = workspace.addNode("change", nodeWidth, nodeHeight);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth * 2, nodeHeight);
            var debugNode = workspace.addNode("debug", nodeWidth * 3, nodeHeight);

            injectNode.edit()
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
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.eql(-1);
        });

        it('work with cookies', function () {
            this.timeout(60000);

            var httpinNodeFormat = workspace.addNode("httpin");
            var functionNodeFormat = workspace.addNode("function", nodeWidth * 1.5);
            var templateNode = workspace.addNode("template", nodeWidth * 2.5);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3.5);

            var httpinNodeAdd = workspace.addNode("httpin", 0, nodeHeight);
            var functionNodeAdd = workspace.addNode("function", nodeWidth * 1.5, nodeHeight);
            var changeNode = workspace.addNode("change", nodeWidth * 2.5, nodeHeight * 1.5);

            var httpinNodeClear = workspace.addNode("httpin", 0, nodeHeight * 2);
            var functionNodeClear = workspace.addNode("function", nodeWidth * 1.5, nodeHeight * 2);

            httpinNodeFormat.edit();
            httpinNodeFormat.setMethod("get");
            httpinNodeFormat.setUrl("/hello-cookie");
            httpinNodeFormat.clickOk();

            functionNodeFormat.edit();
            functionNodeFormat.setFunction("msg.payload = JSON.stringify(msg.req.cookies,null,4);\nreturn msg;");
            functionNodeFormat.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate('<html>\n<head></head>\n<body>\n<h1>Cookies</h1>\n<p></p><a href="hello-cookie/add">Add a cookie</a> &bull; <a href="hello-cookie/clear">Clear cookies</a></p>\n<pre>{{ payload }}</pre>\n</body>\n</html>');
            templateNode.clickOk();

            httpinNodeFormat.connect(functionNodeFormat);
            functionNodeFormat.connect(templateNode);
            templateNode.connect(httpResponseNode);

            httpinNodeAdd.edit();
            httpinNodeAdd.setMethod("get");
            httpinNodeAdd.setUrl("/hello-cookie/add");
            httpinNodeAdd.clickOk();

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

            httpinNodeAdd.connect(functionNodeAdd);
            functionNodeAdd.connect(changeNode);
            changeNode.connect(httpResponseNode);

            httpinNodeClear.edit();
            httpinNodeClear.setMethod("get");
            httpinNodeClear.setUrl("/hello-cookie/clear");
            httpinNodeClear.clickOk();

            functionNodeClear.edit();
            functionNodeClear.setFunction("var cookieNames = Object.keys(msg.req.cookies).filter(function(cookieName) { return /^demo-/.test(cookieName);});\nmsg.cookies = {};\n\ncookieNames.forEach(function(cookieName) {\n    msg.cookies[cookieName] = null;\n});\nreturn msg;\n");
            functionNodeClear.clickOk();

            httpinNodeClear.connect(functionNodeClear);
            functionNodeClear.connect(changeNode);

            workspace.deploy();
            // This case cannot be checked since http request node does not transfer cookies when redirected.
        });
    });
});
