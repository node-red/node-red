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
const crypto = require('crypto')
var express = require('express');
var fs = require("fs");
var path = require("path");
var Mustache = require("mustache");
var mime = require("mime");

var apiUtils = require("../util");

var theme = require("./theme");

var runtimeAPI;
let settings;
var editorClientDir = path.dirname(require.resolve("@node-red/editor-client"));
var defaultNodeIcon = path.join(editorClientDir,"public","red","images","icons","arrow-in.svg");
var editorTemplatePath = path.join(editorClientDir,"templates","index.mst");
var editorTemplate;
let cacheBuster

module.exports = {
    init: function(_settings, _runtimeAPI) {
        settings = _settings;
        runtimeAPI = _runtimeAPI;
        editorTemplate = fs.readFileSync(editorTemplatePath,"utf8");
        Mustache.parse(editorTemplate);
    },

    ensureSlash: function(req,res,next) {
        var parts = req.originalUrl.split("?");
        if (parts[0].slice(-1) != "/") {
            parts[0] += "/";
            var redirect = parts.join("?");
            res.redirect(301,redirect);
        } else {
            next();
        }
    },
    icon: function(req,res) {
        var icon = req.params.icon;
        var scope = req.params.scope;
        var module = scope ? scope + '/' +  req.params.module : req.params.module;
        var opts = {
            user: req.user,
            module: module,
            icon: icon
        }
        runtimeAPI.nodes.getIcon(opts).then(function(data) {
            if (data) {
                var contentType = mime.getType(icon);
                res.set("Content-Type", contentType);
                res.send(data);
            } else {
                res.sendFile(defaultNodeIcon);
            }
        }).catch(function(err) {
            console.log(err.stack);
            apiUtils.rejectHandler(req,res,err);
        })
    },

    moduleResource: function(req, res) {
        let resourcePath = req.params[1];
        let opts = {
            user: req.user,
            module: req.params[0],
            path: resourcePath
        }
        runtimeAPI.nodes.getModuleResource(opts).then(function(data) {
            if (data) {
                var contentType = mime.getType(resourcePath);
                res.set("Content-Type", contentType);
                res.send(data);
            } else {
                res.status(404).end()
            }
        }).catch(function(err) {
            console.log(err.stack);
            apiUtils.rejectHandler(req,res,err);
        })
    },

    editor: async function(req,res) {
        if (!cacheBuster) {
            // settings.instanceId is set asynchronously to the editor-api
            // being initiaised. So we defer calculating the cacheBuster hash
            // until the first load of the editor
            cacheBuster = crypto.createHash('sha1').update(`${settings.version || 'version'}-${settings.instanceId || 'instanceId'}`).digest("hex").substring(0,12)    
        }

        let sessionMessages;
        if (req.session && req.session.messages) {
            sessionMessages = JSON.stringify(req.session.messages);
            delete req.session.messages
        }
        res.send(Mustache.render(editorTemplate,{
            sessionMessages,
            cacheBuster,
            ...await theme.context()
        }));
    },
    editorResources: express.static(path.join(editorClientDir,'public'))
};
