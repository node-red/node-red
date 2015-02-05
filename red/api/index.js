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
var util = require('util');
var path = require('path');
var passport = require('passport');

var ui = require("./ui");
var nodes = require("./nodes");
var flows = require("./flows");
var library = require("./library");
var info = require("./info");

var auth = require("./auth");
var needsPermission = auth.needsPermission;

var settings = require("../settings");

var errorHandler = function(err,req,res,next) {
    //TODO: standardize json response
    console.log(err.stack);
    res.send(400,err.toString());
};

function init(adminApp) {
    
    auth.init(settings);
    
    // Editor
    if (!settings.disableEditor) {
        var editorApp = express();
        editorApp.get("/",ui.ensureSlash);
        editorApp.get("/icons/:icon",ui.icon);
        editorApp.use("/",ui.editor);
        adminApp.use(editorApp);
    }

    adminApp.use(express.json());
    adminApp.use(express.urlencoded());
    
    if (settings.adminAuth) {
        //TODO: all passport references ought to be in ./auth
        adminApp.use(passport.initialize());
        adminApp.post("/auth/token",
            auth.ensureClientSecret,
            auth.authenticateClient,
            auth.getToken,
            auth.errorHandler
        );
        adminApp.get("/auth/login",auth.login);
        adminApp.post("/auth/revoke",auth.revoke);
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

    // Library
    library.init(adminApp);
    adminApp.post(new RegExp("/library/flows\/(.*)"),needsPermission("library.write"),library.post);
    adminApp.get("/library/flows",needsPermission("library.read"),library.getAll);
    adminApp.get(new RegExp("/library/flows\/(.*)"),needsPermission("library.read"),library.get);
    
    // Settings
    adminApp.get("/settings",needsPermission("settings.read"),info.settings);
    
    // Error Handler
    adminApp.use(errorHandler);
}

module.exports = {
    init: init
};
