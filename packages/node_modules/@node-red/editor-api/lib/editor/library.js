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
var fs = require('fs');
var fspath = require('path');
var when = require('when');

var runtimeAPI;

module.exports = {
    init: function(_runtimeAPI) {
        runtimeAPI = _runtimeAPI;
    },
    getEntry: function(req,res) {
        var opts = {
            user: req.user,
            library: req.params[0],
            type: req.params[1],
            path: req.params[2]||""
        }
        runtimeAPI.library.getEntry(opts).then(function(result) {
            if (typeof result === "string") {
                if (opts.type === 'flows') {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                } else {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                }
                res.write(result);
                res.end();
            } else {
                res.json(result);
            }
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        });
    },
    saveEntry: function(req,res) {
        var opts = {
            user: req.user,
            library: req.params[0],
            type: req.params[1],
            path: req.params[2]||""
        }
        // TODO: horrible inconsistencies between flows and all other types
        if (opts.type === "flows") {
            opts.meta = {};
            opts.body = JSON.stringify(req.body);
        } else {
            opts.meta = req.body;
            opts.body = opts.meta.text;
            delete opts.meta.text;
        }
        runtimeAPI.library.saveEntry(opts).then(function(result) {
            res.status(204).end();
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        });
    }
}
