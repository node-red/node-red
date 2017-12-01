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

var RED = require("../../red/red.js");

var when = require("when");
var http = require('http');
var express = require("express");
var fs = require('fs-extra');
var app = express();

var server;
var homeDir = './test/resources/home';
var address = '127.0.0.1';
var listenPort = 0; // use ephemeral port
var url;

function cleanup() {
    var flowsFile = homeDir + '/flows_'+require('os').hostname()+'.json';
    try {
        fs.statSync(flowsFile);
        fs.unlinkSync(flowsFile);
    } catch (err) {
    }
};

module.exports = {
    startServer: function(done) {
        cleanup();
        app.use("/",express.static("public"));
        server = http.createServer(app);
        var settings = {
            httpAdminRoot: "/",
            httpNodeRoot: "/api",
            userDir: homeDir,
            functionGlobalContext: { },    // enables global context
            SKIP_BUILD_CHECK: true,
            logging: {console: {level:'off'}}
        };
        RED.init(server, settings);
        app.use(settings.httpAdminRoot,RED.httpAdmin);
        app.use(settings.httpNodeRoot,RED.httpNode);
        server.listen(listenPort, address);
        server.on('listening', function() {
            var port = server.address().port;
            url = 'http://' + address + ':' + port;
        });
        RED.start().then(function() {
            done();
        });
    },

    stopServer: function(done) {
        if (server) {
            try {
                RED.stop().then(function() {
                    server.close(done);
                    cleanup();
                    done();
                });
            } catch(e) {
                cleanup();
                done();
            }
        }
    },

    url: function() {
        return url;
    },

    red: function() {
        return RED;
    },
};
