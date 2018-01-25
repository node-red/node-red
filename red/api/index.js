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

var express = require("express");
var bodyParser = require("body-parser");
var util = require('util');
var passport = require('passport');
var when = require('when');
var cors = require('cors');

var auth = require("./auth");
var apiUtil = require("./util");

var i18n;
var log;
var adminApp;
var server;
var runtime;
var editor;

function init(_server,_runtime) {
    server = _server;
    runtime = _runtime;
    var settings = runtime.settings;
    i18n = runtime.i18n;
    log = runtime.log;
    if (settings.httpAdminRoot !== false) {
        apiUtil.init(runtime);
        adminApp = express();
        auth.init(runtime);

        var maxApiRequestSize = settings.apiMaxLength || '5mb';
        adminApp.use(bodyParser.json({limit:maxApiRequestSize}));
        adminApp.use(bodyParser.urlencoded({limit:maxApiRequestSize,extended:true}));

        adminApp.get("/auth/login",auth.login,apiUtil.errorHandler);
        if (settings.adminAuth) {
            if (settings.adminAuth.type === "strategy") {
                auth.genericStrategy(adminApp,settings.adminAuth.strategy);
            } else if (settings.adminAuth.type === "credentials") {
                adminApp.use(passport.initialize());
                adminApp.post("/auth/token",
                    auth.ensureClientSecret,
                    auth.authenticateClient,
                    auth.getToken,
                    auth.errorHandler
                );
            }
            adminApp.post("/auth/revoke",auth.needsPermission(""),auth.revoke,apiUtil.errorHandler);
        }

        // Editor
        if (!settings.disableEditor) {
            editor = require("./editor");
            var editorApp = editor.init(server, runtime);
            adminApp.use(editorApp);
        }

        if (settings.httpAdminCors) {
            var corsHandler = cors(settings.httpAdminCors);
            adminApp.use(corsHandler);
        }

        var adminApiApp = require("./admin").init(runtime);
        adminApp.use(adminApiApp);
    } else {
        adminApp = null;
    }
}
function start() {
    if (editor) {
        return editor.start();
    } else {
        return when.resolve();
    }
}
function stop() {
    if (editor) {
        editor.stop();
    }
    return when.resolve();
}
module.exports = {
    init: init,
    start: start,
    stop: stop,
    library: {
        register: function(type) {
            if (editor) {
                editor.registerLibrary(type);
            }
        }
    },
    auth: {
        needsPermission: auth.needsPermission
    },
    comms: {
        publish: function(topic,data,retain) {
            if (editor) {
                editor.publish(topic,data,retain);
            }
        }
    },
    get adminApp() { return adminApp; },
    get server() { return server; }
};
