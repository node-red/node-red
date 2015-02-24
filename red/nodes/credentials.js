/**
 * Copyright 2014, 2015 IBM Corp.
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

var when = require("when");

var log = require("../log");
var needsPermission = require("../api/auth").needsPermission;

var credentialCache = {};
var storage = null;
var credentialsDef = {};
var redApp = null;

/**
 * Adds an HTTP endpoint to allow look up of credentials for a given node id.
 */
function registerEndpoint(type) {
    redApp.get('/credentials/' + type + '/:id', needsPermission(type+".read"), function (req, res) {
        // TODO: This could be a generic endpoint with the type value
        //       parameterised.
        //
        // TODO: It should verify the given node id is of the type specified -
        //       but that would add a dependency from this module to the
        //       registry module that knows about node types.
        var nodeType = type;
        var nodeID = req.params.id;

        var credentials = credentialCache[nodeID];
        if (credentials === undefined) {
            res.json({});
            return;
        }
        var definition = credentialsDef[nodeType];

        var sendCredentials = {};
        for (var cred in definition) {
            if (definition.hasOwnProperty(cred)) {
                if (definition[cred].type == "password") {
                    var key = 'has_' + cred;
                    sendCredentials[key] = credentials[cred] != null && credentials[cred] !== '';
                    continue;
                }
                sendCredentials[cred] = credentials[cred] || '';
            }
        }
        res.json(sendCredentials);

    });
}


module.exports = {
    init: function (_storage) {
        storage = _storage;
        // TODO: this should get passed in init function call rather than
        //       required directly.
        redApp = require("../server").app;
    },
    
    /**
     * Loads the credentials from storage.
     */
    load: function () {
        return storage.getCredentials().then(function (creds) {
            credentialCache = creds;
        }).otherwise(function (err) {
            log.warn("Error loading credentials : " + err);
        });
    },
    
    /**
     * Adds a set of credentials for the given node id.
     * @param id the node id for the credentials
     * @param creds an object of credential key/value pairs
     * @return a promise for the saving of credentials to storage
     */
    add: function (id, creds) {
        credentialCache[id] = creds;
        return storage.saveCredentials(credentialCache);
    },

    /**
     * Gets the credentials for the given node id.
     * @param id the node id for the credentials
     * @return the credentials
     */
    get: function (id) {
        return credentialCache[id];
    },

    /**
     * Deletes the credentials for the given node id.
     * @param id the node id for the credentials
     * @return a promise for the saving of credentials to storage
     */
    delete: function (id) {
        delete credentialCache[id];
        storage.saveCredentials(credentialCache);
    },

    /**
     * Deletes any credentials for nodes that no longer exist
     * @param config a flow config
     * @return a promise for the saving of credentials to storage
     */
    clean: function (config) {
        var existingIds = {};
        config.forEach(function(n) {
            existingIds[n.id] = true;     
        });
        var deletedCredentials = false;
        for (var c in credentialCache) {
            if (credentialCache.hasOwnProperty(c)) {
                if (!existingIds[c]) {
                    deletedCredentials = true;
                    delete credentialCache[c];
                }
            }
        }
        if (deletedCredentials) {
            return storage.saveCredentials(credentialCache);
        } else {
            return when.resolve();
        }
    },
    
    /**
     * Registers a node credential definition.
     * @param type the node type
     * @param definition the credential definition
     */
    register: function (type, definition) {
        var dashedType = type.replace(/\s+/g, '-');
        credentialsDef[dashedType] = definition;
        registerEndpoint(dashedType);
    },
    
    /**
     * Extracts and stores any credential updates in the provided node.
     * The provided node may have a .credentials property that contains
     * new credentials for the node.
     * This function loops through the credentials in the definition for
     * the node-type and applies any of the updates provided in the node.
     * 
     * This function does not save the credentials to disk as it is expected
     * to be called multiple times when a new flow is deployed.
     *
     * @param node the node to extract credentials from
     */
    extract: function(node) {
        var nodeID = node.id;
        var nodeType = node.type;
        var newCreds = node.credentials;
        if (newCreds) {
            var savedCredentials = credentialCache[nodeID] || {};
            
            var dashedType = nodeType.replace(/\s+/g, '-');
            var definition = credentialsDef[dashedType];
            if (!definition) {
                log.warn('Credential Type ' + nodeType + ' is not registered.');
                return;
            }
            
            for (var cred in definition) {
                if (definition.hasOwnProperty(cred)) {
                    if (newCreds[cred] === undefined) {
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
            }
            credentialCache[nodeID] = savedCredentials;
            delete node.credentials;
        }
    },
    
    /**
     * Saves the credentials to storage
     * @return a promise for the saving of credentials to storage
     */
    save: function () {
        return storage.saveCredentials(credentialCache);
    },
    
    /**
     * Gets the credential definition for the given node type
     * @param type the node type
     * @return the credential definition
     */
    getDefinition: function (type) {
        return credentialsDef[type];
    }
}
