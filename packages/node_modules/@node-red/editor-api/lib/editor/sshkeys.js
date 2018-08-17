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

var apiUtils = require("../util");
var express = require("express");
var runtimeAPI;

function getUsername(userObj) {
    var username = '__default';
    if ( userObj && userObj.name ) {
        username = userObj.name;
    }
    return username;
}

module.exports = {
    init: function(_runtimeAPI) {
        runtimeAPI = _runtimeAPI;
    },
    app: function() {
        var app = express();

        // List all SSH keys
        app.get("/", function(req,res) {
            var opts = {
                user: req.user
            }
            runtimeAPI.settings.getUserKeys(opts).then(function(list) {
                res.json({
                    keys: list
                });
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            });
        });

        // Get SSH key detail
        app.get("/:id", function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id
            }
            runtimeAPI.settings.getUserKey(opts).then(function(data) {
                res.json({
                    publickey: data
                });
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            });
        });

        // Generate a SSH key
        app.post("/", function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id
            }
            // TODO: validate params
            opts.name = req.body.name;
            opts.password = req.body.password;
            opts.comment = req.body.comment;
            opts.size = req.body.size;

            runtimeAPI.settings.generateUserKey(opts).then(function(name) {
                res.json({
                    name: name
                });
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            });
        });

        // Delete a SSH key
        app.delete("/:id", function(req,res) {
            var opts = {
                user: req.user,
                id: req.params.id
            }
            runtimeAPI.settings.removeUserKey(opts).then(function(name) {
                res.status(204).end();
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            });
        });

        return app;
    }
}
