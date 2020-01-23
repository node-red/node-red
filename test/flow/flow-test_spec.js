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

var http = require('http');
var express = require('express');
var fs = require('fs');
var RED = require('../../packages/node_modules/node-red/lib/red.js');
var runtime = require('../../packages/node_modules/@node-red/runtime');
var should = require('should');
var path = require('path');

var app = express();
app.use('/', express.static('public'));

var server = http.createServer(app);
var address = '127.0.0.1';
var url;

var itemsJson = process.env.TEST_ITEM;

try {
    testItems = JSON.parse(fs.readFileSync(itemsJson, 'utf-8'));
} catch (err) {
    console.log(err);
    throw (err);
}

var settings = {
    httpAdminRoot: "/",
    httpNodeRoot: "/api",
    functionGlobalContext: {},    // enables global context
    SKIP_BUILD_CHECK: true,
    logging: { console: { level: 'off' } }
};
RED.init(server, settings);
server.listen(0, address);
server.on('listening', function() {
    var port = server.address().port;
    url = 'http://' + address + ':' + port;
}); 

describe('', function() {

    this.timeout(30000);

    testFlows = "";

    before(function(done) {
        try {
            RED.start().then(function() {
                setTimeout(function() {
                    testFlows = RED.nodes.getFlows().flows;
                    done();
                }, 1000);
            })
        } catch (err) {
            console.log(err);
            throw err;
        }
    });

    after(function() {
        try {
            return new Promise(function(resolve, reject) {
                if (server) {
                    RED.stop().then(function() {
                        server.close(function() {
                            resolve();
                        });
                    });
                } else {
                    resolve();
                }
            });
        } catch (err) {
            console.log(err);
            throw err;
        }
    });

    testItems.forEach(function(item) {
        describe('Flow test:' + item.id, function() {
            var testinNode;
            var targetNodes = [];

            before(function() {
                var id = item.id;
                testinNode = RED.nodes.getNode(id);

                var nodeType = testinNode ? testinNode.type : '';
                nodeType.should.equal('test in');                

                testFlows.forEach(function(node) {
                    if (node.type === 'test out') {
                        targetNodes.push(node.target);
                    }
                })
                targetNodes.push(testinNode.target);

                targetNodes.forEach(function(target) {
                    // test mode on
                    var n = RED.nodes.getNode(target)
                    if (n) {
                        n.changeTestMode(true);
                    }
                })
            })

            after(function() {
                targetNodes.forEach(function(target) {
                    // test mode off
                    var n = RED.nodes.getNode(target)
                    if (n) {
                        n.changeTestMode(false);
                    }
                })
            })

            var labels = item.labels;
            labels.forEach(function(label) {
                it('Label:' + label, function(done) {
                    try {
                        var msgid = runtime.util.generateId();
                        var msg = { _msgid: msgid, payload: "", topic: "", label: label };
                        setTimeout(function() {
                            testinNode.emit("input", msg);
                        }, 1000);

                        RED.events.on('flow-test:' + label, function(state) {
                            try {
                                state.status.should.equal('passed');
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                    } catch (err) {
                        done(err);
                    }
                });
            })
        });
    });
});