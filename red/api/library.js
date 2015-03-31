/**
 * Copyright 2013, 2015 IBM Corp.
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

var redApp = null;
var storage = require("../storage");
var log = require("../log");
var needsPermission = require("./auth").needsPermission;

function createLibrary(type) {
    if (redApp) {
        redApp.get(new RegExp("/library/"+type+"($|\/(.*))"),needsPermission("library.read"),function(req,res) {
            var path = req.params[1]||"";
            storage.getLibraryEntry(type,path).then(function(result) {
                if (typeof result === "string") {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(result);
                    res.end(); 
                } else {
                    res.json(result);
                }
            }).otherwise(function(err) {
                if (err) {
                    log.warn("Error loading library entry '"+path+"' : "+err);
                    if (err.message.indexOf('forbidden') === 0) {
                        res.send(403);
                        return;
                    }
                }
                res.send(404);
            });
        });
        
        redApp.post(new RegExp("/library/"+type+"\/(.*)"),needsPermission("library.write"),function(req,res) {
            var path = req.params[0];
            var meta = req.body;
            var text = meta.text;
            delete meta.text;
            
            storage.saveLibraryEntry(type,path,meta,text).then(function() {
                res.send(204);
            }).otherwise(function(err) {
                log.warn("Error saving library entry '"+path+"' : "+err);
                if (err.message.indexOf('forbidden') === 0) {
                    res.send(403);
                    return;
                }
                res.json(500,{error:"unexpected_error", message:err.toString()});
            });
        });
    }
}
module.exports = {
    init: function(app) {
        redApp = app;
    },
    register: createLibrary,
    
    getAll: function(req,res) {
        storage.getAllFlows().then(function(flows) {
            res.json(flows);
        });
    },
    get: function(req,res) {
        storage.getFlow(req.params[0]).then(function(data) {
            // data is already a JSON string
            res.set('Content-Type', 'application/json');
            res.send(data);
        }).otherwise(function(err) {
            if (err) {
                log.warn("Error loading flow '"+req.params[0]+"' : "+err);
                if (err.message.indexOf('forbidden') === 0) {
                    res.send(403);
                    return;
                }
            }
            res.send(404);
        });
    },
    post: function(req,res) {
        var flow = JSON.stringify(req.body);
        storage.saveFlow(req.params[0],flow).then(function() {
            res.send(204);
        }).otherwise(function(err) {
            log.warn("Error loading flow '"+req.params[0]+"' : "+err);
            if (err.message.indexOf('forbidden') === 0) {
                res.send(403);
                return;
            }
            res.send(500);
        });
    }
}
