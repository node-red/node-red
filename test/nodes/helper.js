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
var sinon = require("sinon");
var when = require("when");
var request = require('supertest');
var express = require("express");
var nock;
if (!process.version.match(/^v0\.[0-9]\./)) {
    // only set nock for node >= 0.10
    try {
        nock = require('nock');
    } catch (err) {
        // nevermind, will skip nock tests
        nock = null;
    }
}
var RED = require("../../red/red.js");
var redNodes = require("../../red/runtime/nodes");
var flows = require("../../red/runtime/nodes/flows");
var credentials = require("../../red/runtime/nodes/credentials");
var comms = require("../../red/api/comms.js");
var log = require("../../red/runtime/log.js");
var context = require("../../red/runtime/nodes/context.js");

var http = require('http');
var express = require('express');
var app = express();

var address = '127.0.0.1';
var listenPort = 0; // use ephemeral port
var port;
var url;
var logSpy;
var server;

function helperNode(n) {
    RED.nodes.createNode(this, n);
}

module.exports = {
    load: function(testNode, testFlows, testCredentials, cb) {
        var i;

        logSpy = sinon.spy(log,"log");
        logSpy.FATAL = log.FATAL;
        logSpy.ERROR = log.ERROR;
        logSpy.WARN = log.WARN;
        logSpy.INFO = log.INFO;
        logSpy.DEBUG = log.DEBUG;
        logSpy.TRACE = log.TRACE;
        logSpy.METRIC = log.METRIC;

        if (typeof testCredentials === 'function') {
            cb = testCredentials;
            testCredentials = {};
        }

        var storage = {
            getFlows: function() {
                return when.resolve({flows:testFlows,credentials:testCredentials});
            }
        };

        var settings = {
            available: function() { return false; }
        };

        var red = {};
        for (i in RED) {
            if (RED.hasOwnProperty(i) && !/^(init|start|stop)$/.test(i)) {
                var propDescriptor = Object.getOwnPropertyDescriptor(RED,i);
                Object.defineProperty(red,i,propDescriptor);
            }
        }

        red["_"] = function(messageId) {
            return messageId;
        };

        redNodes.init({settings:settings, storage:storage,log:log});
        RED.nodes.registerType("helper", helperNode);
        if (Array.isArray(testNode)) {
            for (i = 0; i < testNode.length; i++) {
                testNode[i](red);
            }
        } else {
            testNode(red);
        }
        flows.load().then(function() {
            flows.startFlows();
            should.deepEqual(testFlows, flows.getFlows().flows);
            cb();
        });
    },

    unload: function() {
        // TODO: any other state to remove between tests?
        redNodes.clearRegistry();
        logSpy.restore();
        context.clean({allNodes:[]});
        return flows.stopFlows();
    },

    getNode: function(id) {
        return flows.get(id);
    },

    credentials: credentials,

    clearFlows: function() {
        return flows.stopFlows();
    },

    request: function() {
        return request(RED.httpAdmin);
    },

    startServer: function(done) {
        server = http.createServer(function(req,res) { app(req,res); });
        RED.init(server, {
            SKIP_BUILD_CHECK: true,
            logging:{console:{level:'off'}}
        });
        server.listen(listenPort, address);
        server.on('listening', function() {
            port = server.address().port;
            url = 'http://' + address + ':' + port;
            comms.start();
            done();
        });
    },

    //TODO consider saving TCP handshake/server reinit on start/stop/start sequences
    stopServer: function(done) {
        if (server) {
            try {
                server.on('close', function() {
                    comms.stop();
                });
                server.close(done);
            } catch(e) {
                done();
            }
        }
    },

    url: function() { return url; },

    nock: nock,

    log: function() { return logSpy;}
};
