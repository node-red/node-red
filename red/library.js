/**
 * Copyright 2013 IBM Corp.
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
var storage = null;

function init() {
    redApp = require("./server").app;
    storage = require("./storage");
    
    // -------- Flow Library --------
    redApp.post(new RegExp("/library/flows\/(.*)"), function(req,res) {
            var fullBody = '';
            req.on('data', function(chunk) {
                fullBody += chunk.toString();
            });
            req.on('end', function() {
                storage.saveFlow(req.params[0],fullBody).then(function() {
                    res.send(204);
                }).otherwise(function(err) {
                    util.log("[red] Error loading flow '"+req.params[0]+"' : "+err);
                    res.send(500);
                });
            });
    });
    
    redApp.get("/library/flows",function(req,res) {
            storage.getAllFlows().then(function(flows) {
                res.json(flows);
            });
    });
    
    redApp.get(new RegExp("/library/flows\/(.*)"), function(req,res) {
            storage.getFlow(req.params[0]).then(function(data) {
                res.set('Content-Type', 'application/json');
                res.send(data);
            }).otherwise(function(err) {
                if (err) {
                    util.log("[red] Error loading flow '"+req.params[0]+"' : "+err);
                }
                res.send(404);
            });
    });
    
    // ------------------------------
}    

function createLibrary(type) {
    
    redApp.get(new RegExp("/library/"+type+"($|\/(.*))"),function(req,res) {
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
                    util.log("[red] Error loading library entry '"+path+"' : "+err);
                }
                res.send(404);
            });
    });
    
    redApp.post(new RegExp("/library/"+type+"\/(.*)"),function(req,res) {
            var path = req.params[0];
            var fullBody = '';
            req.on('data', function(chunk) {
                    fullBody += chunk.toString();
            });
            req.on('end', function() {
                    storage.saveLibraryEntry(type,path,req.query,fullBody).then(function() {
                        res.send(204);
                    }).otherwise(function(err) {
                        util.log("[red] Error saving library entry '"+path+"' : "+err);
                        res.send(500);
                    });;
            });
    });
}

module.exports.init = init;
module.exports.register = createLibrary;
