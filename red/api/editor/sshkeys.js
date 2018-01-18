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
var os = require("os");
var runtime;
var settings;
var needsPermission = require("../auth").needsPermission;

function getUsername(userObj) {
    var username = '__default';
    if ( userObj && userObj.name ) {
        username = userObj.name;
    }
    return username;
}

module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        settings = runtime.settings;
    },
    app: function() {
        var app = express();

        // SSH keys

        // List all SSH keys
        app.get("/", needsPermission("settings.read"), function(req,res) {
            var username = getUsername(req.user);
            runtime.storage.projects.ssh.listSSHKeys(username)
            .then(function(list) {
                res.json({
                    keys: list
                });
            })
            .catch(function(err) {
                // console.log(err.stack);
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            });
        });

        // Get SSH key detail
        app.get("/:id", needsPermission("settings.read"), function(req,res) {
            var username = getUsername(req.user);
            // console.log('username:', username);
            runtime.storage.projects.ssh.getSSHKey(username, req.params.id)
            .then(function(data) {
                if (data) {
                    res.json({
                        publickey: data
                    });
                } else {
                    res.status(404).end();
                }
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            });
        });

        // Generate a SSH key
        app.post("/", needsPermission("settings.write"), function(req,res) {
            var username = getUsername(req.user);
            // console.log('req.body:', req.body);
            if ( req.body && req.body.name && /^[a-zA-Z0-9\-_]+$/.test(req.body.name)) {
                runtime.storage.projects.ssh.generateSSHKey(username, req.body)
                .then(function(name) {
                    // console.log('generate key --- success  name:', name);
                    res.json({
                        name: name
                    });
                })
                .catch(function(err) {
                    if (err.code) {
                        res.status(400).json({error:err.code, message: err.message});
                    } else {
                        res.status(400).json({error:"unexpected_error", message:err.toString()});
                    }
                });
            }
            else {
                res.status(400).json({error:"unexpected_error", message:"You need to have body or body.name"});
            }
        });

        // Delete a SSH key
        app.delete("/:id", needsPermission("settings.write"), function(req,res) {
            var username = getUsername(req.user);
            runtime.storage.projects.ssh.deleteSSHKey(username, req.params.id)
            .then(function() {
                res.status(204).end();
            })
            .catch(function(err) {
                if (err.code) {
                    res.status(400).json({error:err.code, message: err.message});
                } else {
                    res.status(400).json({error:"unexpected_error", message:err.toString()});
                }
            });
        });

        return app;
    }
}
