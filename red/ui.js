/**
 * Copyright 2013, 2014 IBM Corp.
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
var express = require('express');
var fs = require("fs");
var events = require("./events");
var path = require("path");

var icon_paths = [path.resolve(__dirname + '/../public/icons')];

var settings; // settings has to be global, otherwise variable not in scope for express

events.on("node-icon-dir",function(dir) {
    icon_paths.push(path.resolve(dir));
});


function setupUI(_settings,app) {
    
    settings = _settings;
    
    // Need to ensure the url ends with a '/' so the static serving works
    // with relative paths
    app.get("/",function(req,res) {
        if (req.originalUrl.slice(-1) != "/") {
            res.redirect(req.originalUrl+"/");
        } else {
            req.next();
        }
    });
    
    var iconCache = {};
    //TODO: create a default icon
    var defaultIcon = path.resolve(__dirname + '/../public/icons/arrow-in.png');
    
    app.get("/icons/:icon",function(req,res) {
        if (iconCache[req.params.icon]) {
            res.sendfile(iconCache[req.params.icon]); // if not found, express prints this to the console and serves 404
        } else { 
            for (var p=0;p<icon_paths.length;p++) {
                var iconPath = path.join(icon_paths[p],req.params.icon);
                if (fs.existsSync(iconPath)) {
                    res.sendfile(iconPath);
                    iconCache[req.params.icon] = iconPath;
                    return;
                }
            }
            res.sendfile(defaultIcon);
        }
    });
    
    app.get("/settings", function(req,res) {
        var safeSettings = {
            httpNodeRoot: settings.httpNodeRoot,
            version: settings.version
        };
        res.json(safeSettings);
    });
    
    app.use("/",express.static(__dirname + '/../public'));
    
    return app;
}

module.exports = setupUI;
