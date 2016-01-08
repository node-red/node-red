/**
 * Copyright 2014, 2015 IBM Corp.
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
var flow = require("./flow");
var library = require("./library");
var info = require("./info");
var theme = require("./theme");
var locales = require("./locales");
var credentials = require("./credentials");
var comms = require("./comms");

var auth = require("./auth");
var needsPermission = auth.needsPermission;

var i18n;
var log;
var adminApp;
var nodeApp;
var server;

var errorHandler = function(err,req,res,next) {
    if (err.message === "request entity too large") {
        log.error(err);
    } else {
        console.log(err.stack);
    }
    log.audit({event: "api.error",error:err.code||"unexpected_error",message:err.toString()},req);
    res.status(400).json({error:"unexpected_error", message:err.toString()});
};

function init(_server,runtime) {
    server = _server;
    var settings = runtime.settings;
    i18n = runtime.i18n;
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
        flow.init(runtime);
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
            theme.init(runtime);
            if (settings.editorTheme) {
                editorApp.use("/theme",theme.app());
            }
            editorApp.use("/",ui.editorResources);
            adminApp.use(editorApp);
        }
        var maxApiRequestSize = settings.apiMaxLength || '1mb';
        adminApp.use(bodyParser.json({limit:maxApiRequestSize}));
        adminApp.use(bodyParser.urlencoded({limit:maxApiRequestSize,extended:true}));

        adminApp.get("/auth/login",auth.login,errorHandler);

        if (settings.adminAuth) {
            //TODO: all passport references ought to be in ./auth
            adminApp.use(passport.initialize());
            adminApp.post("/auth/token",
                auth.ensureClientSecret,
                auth.authenticateClient,
                auth.getToken,
                auth.errorHandler
            );
            adminApp.post("/auth/revoke",needsPermission(""),auth.revoke,errorHandler);
        }

        // Flows
        adminApp.get("/flows",needsPermission("flows.read"),flows.get,errorHandler);
        adminApp.post("/flows",needsPermission("flows.write"),flows.post,errorHandler);

        adminApp.get("/flow/:id",needsPermission("flows.read"),flow.get,errorHandler);
        adminApp.post("/flow",needsPermission("flows.write"),flow.post,errorHandler);
        adminApp.delete("/flow/:id",needsPermission("flows.write"),flow.delete,errorHandler);
        adminApp.put("/flow/:id",needsPermission("flows.write"),flow.put,errorHandler);

        // Nodes
        adminApp.get("/nodes",needsPermission("nodes.read"),nodes.getAll,errorHandler);
        adminApp.post("/nodes",needsPermission("nodes.write"),nodes.post,errorHandler);

        adminApp.get("/nodes/:mod",needsPermission("nodes.read"),nodes.getModule,errorHandler);
        adminApp.put("/nodes/:mod",needsPermission("nodes.write"),nodes.putModule,errorHandler);
        adminApp.delete("/nodes/:mod",needsPermission("nodes.write"),nodes.delete,errorHandler);

        adminApp.get("/nodes/:mod/:set",needsPermission("nodes.read"),nodes.getSet,errorHandler);
        adminApp.put("/nodes/:mod/:set",needsPermission("nodes.write"),nodes.putSet,errorHandler);

        adminApp.get('/credentials/:type/:id', needsPermission("credentials.read"),credentials.get,errorHandler);

        adminApp.get(/locales\/(.+)\/?$/,locales.get,errorHandler);

        // Library
        adminApp.post(new RegExp("/library/flows\/(.*)"),needsPermission("library.write"),library.post,errorHandler);
        adminApp.get("/library/flows",needsPermission("library.read"),library.getAll,errorHandler);
        adminApp.get(new RegExp("/library/flows\/(.*)"),needsPermission("library.read"),library.get,errorHandler);

        // Settings
        adminApp.get("/settings",needsPermission("settings.read"),info.settings,errorHandler);

        // Error Handler
        //adminApp.use(errorHandler);
    }
}
function start() {
    return i18n.registerMessageCatalog("editor",path.resolve(path.join(__dirname,"locales")),"editor.json").then(function(){
        comms.start();
    });
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
    get adminApp() { return adminApp; },
    get nodeApp() { return nodeApp; },
    get server() { return server; }
};
