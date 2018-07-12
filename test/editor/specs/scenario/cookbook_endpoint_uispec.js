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
var debugTab = require('../../pageobjects/workspace/debugTab_page');
var workspace = require('../../pageobjects/workspace/workspace_page');

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
        it('Create an HTTP Endpoint', function () {
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
            httpRequestNode.setMethod("get");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello World!').should.not.be.equal(-1);
        });

        it('Handle query parameters passed to an HTTP endpoint', function () {
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
            httpRequestNode.setMethod("get");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.be.equal(-1);
        });

        it('Handle url parameters in an HTTP endpoint', function () {
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
            httpRequestNode.setMethod("get");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Dave!').should.not.be.equal(-1);
        });

        it('Access HTTP request headers', function () {
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
            changeNode.ruleSet("headers", "msg", "{\"user-agent\":\"Mozilla/5.0 (Windows NT 10.0; Win64; x64)\"}", "json");
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-headers');
            httpRequestNode.setMethod("get");
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Mozilla').should.not.be.equal(-1);
        });

        it('Include data captured in another flow', function () {
            var injectNode_timestamp = workspace.addNode("inject");
            var changeNode_store = workspace.addNode("change", nodeWidth);

            var httpinNode = workspace.addNode("httpin", 0, nodeHeight);
            var changeNode_copy = workspace.addNode("change", nodeWidth * 2, nodeHeight);
            var templateNode = workspace.addNode("template", nodeWidth * 3, nodeHeight);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 4, nodeHeight);

            injectNode_timestamp.edit();
            injectNode_timestamp.setPayload("date");
            injectNode_timestamp.clickOk();

            changeNode_store.edit();
            changeNode_store.ruleSet("timestamp", "flow", "payload", "msg");
            changeNode_store.clickOk();

            injectNode_timestamp.connect(changeNode_store);

            httpinNode.edit();
            httpinNode.setMethod("get");
            httpinNode.setUrl("/hello-data");
            httpinNode.clickOk();

            changeNode_copy.edit();
            changeNode_copy.ruleSet("timestamp", "msg", "timestamp", "flow");
            changeNode_copy.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Time: {{ timestamp }}</h1>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode.connect(changeNode_copy);
            changeNode_copy.connect(templateNode);
            templateNode.connect(httpResponseNode);

            // The code for confirmation starts from here.
            var injectNode_check = workspace.addNode("inject", 0, nodeHeight * 2);
            var httpRequestNode = workspace.addNode("httpRequest", nodeWidth, nodeHeight * 2);
            var debugNode = workspace.addNode("debug", nodeWidth * 2, nodeHeight * 2);

            httpRequestNode.edit();
            httpRequestNode.setMethod("get");
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-data');
            httpRequestNode.clickOk();

            injectNode_check.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode_timestamp.clickLeftButton();
            injectNode_check.clickLeftButton();
            var index = debugTab.getMessage().indexOf('Time: ') + 6;
            debugTab.getMessage().substring(index, index + 13).should.within(1500000000000, 3000000000000);
        });

        it('Serve JSON content', function () {
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
            templateNode.setTemplate("{ \"Hello\": \"World\" }");
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
            httpRequestNode.setMethod("get");
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-json');
            httpRequestNode.clickOk();

            debugNode.edit();
            debugNode.setTarget("msg", "headers");
            debugNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            var message = debugTab.getMessage();
            message[1].indexOf('application/json').should.not.be.equal(-1);
        });

        it('Serve a local file', function () {
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
            fileinNode.setFormat("");
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
            httpRequestNode.setMethod("get");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Text file').should.not.be.equal(-1);
        });

        it('Post raw data to a flow', function() {
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
            httpRequestNode.setMethod("post");
            httpRequestNode.clickOk();

            injectNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.be.equal(-1);
        });

        it('Post form data to a flow', function () {
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
            changeNode.ruleSet("headers", "msg", "{\"content-type\":\"application/x-www-form-urlencoded\"}", "json");
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-form');
            httpRequestNode.setMethod("post");
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.be.equal(-1);
        });

        it('Post JSON data to a flow', function() {
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
            injectNode.setPayload("json", "{\"name\":\"Nick\"}");
            injectNode.clickOk();

            changeNode.edit();
            changeNode.ruleSet("headers", "msg", "{\"content-type\":\"application/json\"}", "json");
            changeNode.clickOk();

            httpRequestNode.edit();
            httpRequestNode.setUrl(helper.url() + httpNodeRoot + '/hello-json');
            httpRequestNode.setMethod("post");
            httpRequestNode.clickOk();

            injectNode.connect(changeNode);
            changeNode.connect(httpRequestNode);
            httpRequestNode.connect(debugNode);
            // The code for confirmation ends here.

            workspace.deploy();
            debugTab.open();
            debugTab.clearMessage();
            injectNode.clickLeftButton();
            debugTab.getMessage().indexOf('Hello Nick!').should.not.be.equal(-1);
        });

        it('Work with cookies', function () {
            this.timeout(60000);

            var httpinNode_format = workspace.addNode("httpin");
            var functionNode_format = workspace.addNode("function", nodeWidth * 1.5);
            var templateNode = workspace.addNode("template", nodeWidth * 2.5);
            var httpResponseNode = workspace.addNode("httpResponse", nodeWidth * 3.5);

            var httpinNode_add = workspace.addNode("httpin", 0, nodeHeight);
            var functionNode_add = workspace.addNode("function", nodeWidth * 1.5, nodeHeight);
            var changeNode = workspace.addNode("change", nodeWidth * 2.5, nodeHeight * 1.5);

            var httpinNode_clear = workspace.addNode("httpin", 0, nodeHeight * 2);
            var functionNode_clear = workspace.addNode("function", nodeWidth * 1.5, nodeHeight * 2);

            httpinNode_format.edit();
            httpinNode_format.setMethod("get");
            httpinNode_format.setUrl("/hello-cookie");
            httpinNode_format.clickOk();

            functionNode_format.edit();
            functionNode_format.setCode("msg.payload = JSON.stringify(msg.req.cookies,null,4);");
            functionNode_format.clickOk();

            templateNode.edit();
            templateNode.setSyntax("mustache");
            templateNode.setFormat("handlebars");
            templateNode.setTemplate("<html>\n<head></head>\n<body>\n<h1>Cookies</h1>\n<p></p><a href=\"hello-cookie/add\">Add a cookie</a> &bull; <a href=\"hello-cookie/clear\">Clear cookies</a></p>\n<pre>{{ payload }}</pre>\n</body>\n</html>");
            templateNode.clickOk();

            httpinNode_format.connect(functionNode_format);
            functionNode_format.connect(templateNode);
            templateNode.connect(httpResponseNode);

            httpinNode_add.edit();
            httpinNode_add.setMethod("get");
            httpinNode_add.setUrl("/hello-cookie/add");
            httpinNode_add.clickOk();

            functionNode_add.edit();
            functionNode_add.setCode("msg.cookies = { };\n msg.cookies[\"demo-\"+(Math.floor(Math.random()*1000))] = Date.now();");
            functionNode_add.clickOk();

            changeNode.edit();
            changeNode.ruleSet("statusCode", "msg", "302", "num");
            changeNode.addRule();
            changeNode.ruleSet("headers", "msg", "{}", "json", "2");
            changeNode.addRule();
            changeNode.ruleSet("headers.location", "msg", httpNodeRoot + "/hello-cookie", "str", "3");
            changeNode.clickOk();

            httpinNode_add.connect(functionNode_add);
            functionNode_add.connect(changeNode);
            changeNode.connect(httpResponseNode);

            httpinNode_clear.edit();
            httpinNode_clear.setMethod("get");
            httpinNode_clear.setUrl("/hello-cookie/clear");
            httpinNode_clear.clickOk();

            functionNode_clear.edit();
            functionNode_clear.setCode("var cookieNames = Object.keys(msg.req.cookies).filter(function(cookieName) { return /^demo-/.test(cookieName);});\nmsg.cookies = {};\n\ncookieNames.forEach(function(cookieName) {\n    msg.cookies[cookieName] = null;\n});\n\n");
            functionNode_clear.clickOk();

            httpinNode_clear.connect(functionNode_clear);
            functionNode_clear.connect(changeNode);

            workspace.deploy();
            // This case cannot be checked since http request node does not transfer cookies when redirected.
        });
    });
});
