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
var when = require("when");

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
        restGET(dashedType);
    },
    /**
     * Merge the new credentials with the existings one and save them into the file
     * @param credentialsNodes - Credentials to be merged. format: [{id: NODE_ID, type: NODE_TYPE, creds: {CREDENTIALS}}, ...]
     * @returns {promise}
     */
    merge: function (credentialsNodes) {
        return when.promise(function (resolve, reject) {
            for (var key in credentialsNodes) {
                var nodeID = credentialsNodes[key].id;
                var newCreds = credentialsNodes[key].creds;
                var savedCredentials = Credentials.get(nodeID) || {};

                if (!isRegistered(credentialsNodes[key].type)) {
                    reject('Credential Type ' + credentialsNodes[key].type + ' is not registered.');
                    return;
                }

                var definition = getCredDef(credentialsNodes[key].type);
                for (var cred in definition) {
                    if (newCreds[cred] == undefined) {
                        continue;
                    }
                    if (definition[cred].type == "password" && newCreds[cred] == '__PWRD__') {
                        continue;
                    }
                    if (0 === newCreds[cred].length || /^\s*$/.test(newCreds[cred])) {
                        delete savedCredentials[cred];
                        continue;
                    }
                    savedCredentials[cred] = newCreds[cred];
                }
                credentials[nodeID] = savedCredentials;

            }
            storage.saveCredentials(credentials).then(function () {
                resolve();
            }).otherwise(function(err) {
                reject(err);
            });

        });
    }
}
