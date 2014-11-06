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
var passport = require('passport');

var ui = require("./ui");
var nodes = require("./nodes");
var flows = require("./flows");
var library = require("./library");
var info = require("./info");

var auth = require("./auth");

var settings = require("../settings");

var errorHandler = function(err,req,res,next) {
    //TODO: standardize json response
    res.send(400,err.toString());
};

function init(adminApp) {
    
    var apiApp = express();
    
    adminApp.use(express.json());
    adminApp.use(express.urlencoded());
    
    //TODO: all passport references ought to be in ./auth
    apiApp.use(passport.initialize());
    
    apiApp.use(auth.authenticate);
    apiApp.post("/auth/token",
        auth.ensureClientSecret,
        auth.authenticateClient,
        auth.getToken,
        auth.errorHandler
    );

    // Flows
    apiApp.get("/flows",flows.get);
    apiApp.post("/flows",flows.post);
    
    // Nodes
    apiApp.get("/nodes",nodes.getAll);
    apiApp.post("/nodes",nodes.post);

    apiApp.get("/nodes/:mod",nodes.getModule);
    apiApp.put("/nodes/:mod",nodes.putModule);
    apiApp.delete("/nodes/:mod",nodes.delete);
    
    apiApp.get("/nodes/:mod/:set",nodes.getSet);
    apiApp.put("/nodes/:mod/:set",nodes.putSet);

    // Library
    library.init(apiApp);
    apiApp.post(new RegExp("/library/flows\/(.*)"),library.post);
    apiApp.get("/library/flows",library.getAll);
    apiApp.get(new RegExp("/library/flows\/(.*)"),library.get);
    
    // Settings
    apiApp.get("/settings",info.settings);
    
    // Editor
    if (!settings.disableEditor) {
        adminApp.get("/",ui.ensureSlash);
        adminApp.get("/icons/:icon",ui.icon);
        adminApp.use("/",ui.editor);
    }
    
    adminApp.use(apiApp);
    
    // Error Handler
    adminApp.use(errorHandler);
}

module.exports = {
    init: init
};
