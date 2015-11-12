/**
 * Copyright 2014 IBM Corp.
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
var path = require('path');
var passport = require('passport');
var when = require('when');

var ui = require("./ui");
var nodes = require("./nodes");
var flows = require("./flows");
var library = require("./library");
var info = require("./info");
var theme = require("./theme");
var locales = require("./locales");
var credentials = require("./credentials");
var comms = require("./comms");

var auth = require("./auth");
var needsPermission = auth.needsPermission;

var log;
var adminApp;
var nodeApp;

var errorHandler = function(err,req,res,next) {
    if (err.message === "request entity too large") {
        log.error(err);
    } else {
        console.log(err.stack);
    }
    log.audit({event: "api.error",error:err.code||"unexpected_error",message:err.toString()},req);
    res.status(400).json({error:"unexpected_error", message:err.toString()});
};

function init(server,runtime) {
    var settings = runtime.settings;
    log = runtime.log;
    if (settings.httpNodeRoot !== false) {
        nodeApp = express();
    }
    if (settings.httpAdminRoot !== false) {
        comms.init(server,runtime);
        adminApp = express();
        auth.init(runtime);
        credentials.init(runtime);
        flows.init(runtime);
        info.init(runtime);
        library.init(adminApp,runtime);
        locales.init(runtime);
        nodes.init(runtime);

        // Editor
        if (!settings.disableEditor) {
            ui.init(runtime);
            var editorApp = express();
            editorApp.get("/",ui.ensureSlash,ui.editor);
            editorApp.get("/icons/:icon",ui.icon);
            if (settings.editorTheme) {
                editorApp.use("/theme",theme.init(runtime));
            }
            editorApp.use("/",ui.editorResources);
            adminApp.use(editorApp);
        }
        var maxApiRequestSize = settings.apiMaxLength || '1mb';
        adminApp.use(bodyParser.json({limit:maxApiRequestSize}));
        adminApp.use(bodyParser.urlencoded({limit:maxApiRequestSize,extended:true}));

        adminApp.get("/auth/login",auth.login);

        if (settings.adminAuth) {
            //TODO: all passport references ought to be in ./auth
            adminApp.use(passport.initialize());
            adminApp.post("/auth/token",
                auth.ensureClientSecret,
                auth.authenticateClient,
                auth.getToken,
                auth.errorHandler
            );
            adminApp.post("/auth/revoke",needsPermission(""),auth.revoke);
        }

        // Flows
        adminApp.get("/flows",needsPermission("flows.read"),flows.get);
        adminApp.post("/flows",needsPermission("flows.write"),flows.post);

        // Nodes
        adminApp.get("/nodes",needsPermission("nodes.read"),nodes.getAll);
        adminApp.post("/nodes",needsPermission("nodes.write"),nodes.post);

        adminApp.get("/nodes/:mod",needsPermission("nodes.read"),nodes.getModule);
        adminApp.put("/nodes/:mod",needsPermission("nodes.write"),nodes.putModule);
        adminApp.delete("/nodes/:mod",needsPermission("nodes.write"),nodes.delete);

        adminApp.get("/nodes/:mod/:set",needsPermission("nodes.read"),nodes.getSet);
        adminApp.put("/nodes/:mod/:set",needsPermission("nodes.write"),nodes.putSet);

        adminApp.get('/credentials/:type/:id', needsPermission("credentials.read"),credentials.get);

        adminApp.get(/locales\/(.+)\/?$/,locales.get);

        // Library
        adminApp.post(new RegExp("/library/flows\/(.*)"),needsPermission("library.write"),library.post);
        adminApp.get("/library/flows",needsPermission("library.read"),library.getAll);
        adminApp.get(new RegExp("/library/flows\/(.*)"),needsPermission("library.read"),library.get);

        // Settings
        adminApp.get("/settings",needsPermission("settings.read"),info.settings);

        // Error Handler
        adminApp.use(errorHandler);
    }
}
function start() {
    comms.start();
    return when.resolve();
}
function stop() {
    comms.stop();
    return when.resolve();
}
module.exports = {
    init: init,
    start: start,
    stop: stop,
    library: {
        register: library.register
    },
    auth: {
        needsPermission: auth.needsPermission
    },
    comms: {
        publish: comms.publish
    },
    adminApp: function() { return adminApp; },
    nodeApp: function() { return nodeApp; }
};
