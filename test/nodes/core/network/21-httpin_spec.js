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
var request = require("supertest");
var helper = require("node-red-node-test-helper");
var httpInNode = require("nr-test-utils").require("@node-red/nodes/core/network/21-httpin.js");

describe('HTTP In Node', function() {
    // The test helper gives each load its own RED.httpNode express app.
    // Wrap the node module so the test can send requests to that app.
    var httpApp;
    function httpInModule(RED) {
        httpApp = RED.httpNode;
        return httpInNode(RED);
    }

    var flow = [
        {id:"n1", type:"http in", url:"/user/:name", method:"get", wires:[["n2","n3"]]},
        {id:"n2", type:"http response", wires:[]},
        {id:"n3", type:"helper"}
    ];

    function nonRouteLayerCount() {
        return httpApp._router.stack.filter(function(layer) { return !layer.route; }).length;
    }
    function routeLayerCount() {
        return httpApp._router.stack.filter(function(layer) { return !!layer.route; }).length;
    }

    afterEach(function() {
        return helper.unload();
    });

    describe('url parameters', function() {
        it('should decode a well-formed url parameter', function(done) {
            helper.load(httpInModule, flow, function() {
                var n3 = helper.getNode("n3");
                var received = new Promise(function(resolve) {
                    n3.on("input", resolve);
                });
                request(httpApp).get("/user/caf%C3%A9").expect(200).then(function() {
                    return received;
                }).then(function(msg) {
                    msg.req.params.should.have.property("name", "café");
                    done();
                }).catch(done);
            });
        });

        it('should return a clean 400 response for a malformed url parameter (#4343)', function(done) {
            helper.load(httpInModule, flow, function() {
                var n3 = helper.getNode("n3");
                n3.on("input", function() {
                    done(new Error("flow should not be triggered by a malformed url parameter"));
                });
                request(httpApp).get("/user/%E0%A4%A").then(function(res) {
                    res.status.should.equal(400);
                    res.headers["content-type"].should.match(/^text\/plain/);
                    res.text.should.equal("Bad Request");
                    res.text.should.not.match(/<html|<pre>|URIError|Failed to decode param|\bat\s/i);
                    done();
                }).catch(done);
            });
        });

        it('should not handle malformed parameters for routes it does not own', function(done) {
            helper.load(httpInModule, flow, function() {
                // A route added to httpNode by something other than an http-in node
                httpApp.get("/other/:id", function(req, res) { res.send("ok"); });
                httpApp.use(function testErrorHandler(err, req, res, next) {
                    res.status(418).send("passed through: " + err.message);
                });
                request(httpApp).get("/other/%E0%A4%A").then(function(res) {
                    res.status.should.equal(418);
                    res.text.should.match(/Failed to decode param/);
                    done();
                }).catch(done);
            });
        });

        it('should not leak route or error handler layers on redeploy', function(done) {
            helper.load(httpInModule, flow, function() {
                var routes = routeLayerCount();
                var others = nonRouteLayerCount();
                routes.should.equal(1);
                helper.setFlows(flow, "full").then(function() {
                    routeLayerCount().should.equal(routes);
                    nonRouteLayerCount().should.equal(others);
                    return request(httpApp).get("/user/%E0%A4%A").expect(400, "Bad Request");
                }).then(function() {
                    return helper.unload();
                }).then(function() {
                    routeLayerCount().should.equal(0);
                    // Only express' own query/expressInit middleware remain
                    httpApp._router.stack.filter(function(layer) {
                        return layer.handle.length === 4;
                    }).should.have.length(0);
                    done();
                }).catch(done);
            });
        });
    });
});
