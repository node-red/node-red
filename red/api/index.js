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

var ui = require("./ui");
var nodes = require("./nodes");
var flows = require("./flows");
var library = require("./library");

var settings = require("../settings");

var errorHandler = function(err,req,res,next) {
    //TODO: standardize json response
    res.send(400,err.toString());
};

function init(adminApp) {

    adminApp.use(express.json());

    library.init(adminApp);

    // Editor
    if (!settings.disableEditor) {
        adminApp.get("/",ui.ensureSlash);
        adminApp.get("/icons/:icon",ui.icon);
        adminApp.get("/settings",ui.settings);
        adminApp.use("/",ui.editor);
    }

    // Flows
    adminApp.get("/flows",flows.get);
    adminApp.post("/flows",flows.post);

    // Nodes
    adminApp.get("/nodes",nodes.getAll);
    adminApp.post("/nodes",nodes.post);

    adminApp.get("/nodes/:mod",nodes.getModule);
    adminApp.put("/nodes/:mod",nodes.putModule);
    adminApp.delete("/nodes/:mod",nodes.delete);

    adminApp.get("/nodes/:mod/:set",nodes.getSet);
    adminApp.put("/nodes/:mod/:set",nodes.putSet);

    // Library
    adminApp.post(new RegExp("/library/flows\/(.*)"),library.post);
    adminApp.get("/library/flows",library.getAll);
    adminApp.get(new RegExp("/library/flows\/(.*)"),library.get);

    // Error Handler
    adminApp.use(errorHandler);
}

module.exports = {
    init: init
};
