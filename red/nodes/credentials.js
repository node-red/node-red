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

var util = require("util");

var credentials = {};
var storage = null;
var credentialsDef = {};
var redApp = null;
var querystring = require('querystring');
var Credentials;

function getCredDef(type) {
    var dashedType = type.replace(/\s+/g, '-');
    return credentialsDef[dashedType];
}

function isRegistered(type) {
    return getCredDef(type) != undefined;
}

function restPOST(type) {
    redApp.post('/credentials/' + type + '/:id', function (req, res) {
        var body = "";
        req.on('data', function (chunk) {
            body += chunk;
        });
        req.on('end', function () {
            var nodeType = type;
            var nodeID = req.params.id;

            var newCreds = querystring.parse(body);
            var credentials = Credentials.get(nodeID) || {};
            var definition = getCredDef(nodeType);

            for (var cred in definition) {
                if (newCreds[cred] == undefined) {
                    continue;
                }
                if (definition[cred].type == "password" && newCreds[cred] == '__PWRD__') {
                    continue;
                }
                if (newCreds[cred] == '') {
                    delete credentials[cred];
                }
                credentials[cred] = newCreds[cred];
            }
            Credentials.add(nodeID, credentials);
            res.send(200);
        });
    });
}

function restGET(type) {
    redApp.get('/credentials/' + type + '/:id', function (req, res) {
        var nodeType = type;
        var nodeID = req.params.id;

        var credentials = Credentials.get(nodeID);
        if (credentials == undefined) {
            res.json({});
            return;
        }
        var definition = getCredDef(nodeType);

        var sendCredentials = {};
        for (var cred in definition) {
            if (definition[cred].type == "password") {
                var key = 'has' + cred;
                sendCredentials[key] = credentials[cred] != null && credentials[cred] != '';
                continue;
            }
            sendCredentials[cred] = credentials[cred] || '';
        }
        res.json(sendCredentials);

    });
}
function restDELETE(type) {
    redApp.delete('/credentials/' + type + '/:id', function (req, res) {
        var nodeID = req.params.id;

        Credentials.delete(nodeID);
        res.send(200);
    });
}

module.exports = {
    init: function (_storage) {
        storage = _storage;
        redApp = require("../server").app;
        Credentials = this;
    },
    load: function () {
        return storage.getCredentials().then(function (creds) {
            credentials = creds;
        }).otherwise(function (err) {
            util.log("[red] Error loading credentials : " + err);
        });
    },
    add: function (id, creds) {
        credentials[id] = creds;
        storage.saveCredentials(credentials);
    },

    get: function (id) {
        return credentials[id];
    },

    delete: function (id) {
        delete credentials[id];
        storage.saveCredentials(credentials);
    },

    clean: function (getNode) {
        var deletedCredentials = false;
        for (var c in credentials) {
            var n = getNode(c);
            if (!n) {
                deletedCredentials = true;
                delete credentials[c];
            }
        }
        if (deletedCredentials) {
            storage.saveCredentials(credentials);
        }

    },
    register: function (type, definition) {
        var dashedType = type.replace(/\s+/g, '-');
        credentialsDef[dashedType] = definition;
        restDELETE(dashedType);
        restGET(dashedType);
        restPOST(dashedType);
    }
}
