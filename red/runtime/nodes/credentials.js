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

var when = require("when");
var crypto = require('crypto');
var runtime;
var settings;
var log;

var encryptedCredentials = null;
var credentialCache = {};
var credentialsDef = {};
var dirty = false;

var removeDefaultKey = false;
var encryptionEnabled = null;
var encryptionKeyType; // disabled, system, user, project
var encryptionAlgorithm = "aes-256-ctr";
var encryptionKey;

function decryptCredentials(key,credentials) {
    var creds = credentials["$"];
    var initVector = new Buffer(creds.substring(0, 32),'hex');
    creds = creds.substring(32);
    var decipher = crypto.createDecipheriv(encryptionAlgorithm, key, initVector);
    var decrypted = decipher.update(creds, 'base64', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
}
function encryptCredentials(key,credentials) {
    var initVector = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv(encryptionAlgorithm, key, initVector);
    return {"$":initVector.toString('hex') + cipher.update(JSON.stringify(credentials), 'utf8', 'base64') + cipher.final('base64')};
}

var api = module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        log = runtime.log;
        settings = runtime.settings;
        dirty = false;
        credentialCache = {};
        credentialsDef = {};
        encryptionEnabled = null;
    },

    /**
     * Sets the credentials from storage.
     */
    load: function (credentials) {
        dirty = false;
        var credentialsEncrypted = credentials.hasOwnProperty("$") && Object.keys(credentials).length === 1;

        // Case 1: Active Project in place
        //  - use whatever its config says

        // Case 2: _credentialSecret unset, credentialSecret unset
        //  - generate _credentialSecret and encrypt

        // Case 3: _credentialSecret set, credentialSecret set
        //  - migrate from _credentialSecret to credentialSecret
        //  - delete _credentialSecret

        // Case 4: credentialSecret set
        //  - use it

        var setupEncryptionPromise = when.resolve();

        var projectKey = false;
        var activeProject;
        encryptionKeyType = "";

        if (runtime.storage && runtime.storage.projects) {
            // projects enabled
            activeProject = runtime.storage.projects.getActiveProject();
            if (activeProject) {
                projectKey = activeProject.credentialSecret;
                if (!projectKey) {
                    log.debug("red/runtime/nodes/credentials.load : using active project key - disabled");
                    encryptionKeyType = "disabled";
                    encryptionEnabled = false;
                } else {
                    log.debug("red/runtime/nodes/credentials.load : using active project key");
                    encryptionKeyType = "project";
                    encryptionKey = crypto.createHash('sha256').update(projectKey).digest();
                    encryptionEnabled = true;
                }
            }
        }

        if (encryptionKeyType === '') {
            var defaultKey;
            try {
                defaultKey = settings.get('_credentialSecret');
            } catch(err) {
            }
            if (defaultKey) {
                defaultKey = crypto.createHash('sha256').update(defaultKey).digest();
                encryptionKeyType = "system";
            }
            var userKey;
            try {
                userKey = settings.get('credentialSecret');
            } catch(err) {
                userKey = false;
            }

            if (userKey === false) {
                encryptionKeyType = "disabled";
                log.debug("red/runtime/nodes/credentials.load : user disabled encryption");
                // User has disabled encryption
                encryptionEnabled = false;
                // Check if we have a generated _credSecret to decrypt with and remove
                if (defaultKey) {
                    log.debug("red/runtime/nodes/credentials.load : default key present. Will migrate");
                    if (credentialsEncrypted) {
                        try {
                            credentials = decryptCredentials(defaultKey,credentials)
                        } catch(err) {
                            credentials = {};
                            log.warn(log._("nodes.credentials.error",{message:err.toString()}))
                            var error = new Error("Failed to decrypt credentials");
                            error.code = "credentials_load_failed";
                            return when.reject(error);
                        }
                    }
                    dirty = true;
                    removeDefaultKey = true;
                }
            } else if (typeof userKey === 'string') {
                if (!projectKey) {
                    log.debug("red/runtime/nodes/credentials.load : user provided key");
                }
                if (encryptionKeyType !== 'project') {
                    encryptionKeyType = 'user';
                }
                // User has provided own encryption key, get the 32-byte hash of it
                encryptionKey = crypto.createHash('sha256').update(userKey).digest();
                encryptionEnabled = true;

                if (encryptionKeyType !== 'project' && defaultKey) {
                    log.debug("red/runtime/nodes/credentials.load : default key present. Will migrate");
                    // User has provided their own key, but we already have a default key
                    // Decrypt using default key
                    if (credentialsEncrypted) {
                        try {
                            credentials = decryptCredentials(defaultKey,credentials)
                        } catch(err) {
                            credentials = {};
                            log.warn(log._("nodes.credentials.error",{message:err.toString()}))
                            var error = new Error("Failed to decrypt credentials");
                            error.code = "credentials_load_failed";
                            return when.reject(error);
                        }
                    }
                    dirty = true;
                    removeDefaultKey = true;
                }
            } else {
                log.debug("red/runtime/nodes/credentials.load : no user key present");
                // User has not provide their own key
                if (encryptionKeyType !== 'project') {
                    encryptionKeyType = 'system';
                }
                encryptionKey = defaultKey;
                encryptionEnabled = true;
                if (encryptionKey === undefined) {
                    log.debug("red/runtime/nodes/credentials.load : no default key present - generating one");
                    // No user-provided key, no generated key
                    // Generate a new key
                    defaultKey = crypto.randomBytes(32).toString('hex');
                    try {
                        setupEncryptionPromise = settings.set('_credentialSecret',defaultKey);
                        encryptionKey = crypto.createHash('sha256').update(defaultKey).digest();
                    } catch(err) {
                        log.debug("red/runtime/nodes/credentials.load : settings unavailable - disabling encryption");
                        // Settings unavailable
                        encryptionEnabled = false;
                        encryptionKey = null;
                    }
                    dirty = true;
                } else {
                    log.debug("red/runtime/nodes/credentials.load : using default key");
                }
            }
        }

        if (encryptionEnabled && !dirty) {
            encryptedCredentials = credentials;
        }
        log.debug("red/runtime/nodes/credentials.load : keyType="+encryptionKeyType);
        return setupEncryptionPromise.then(function() {
            var clearInvalidFlag = false;
            if (credentials.hasOwnProperty("$")) {
                if (encryptionEnabled === false) {
                    // The credentials appear to be encrypted, but our config
                    //  thinks they are not.
                    var error = new Error("Failed to decrypt credentials");
                    error.code = "credentials_load_failed";
                    if (activeProject) {
                        // This is a project with a bad key. Mark it as invalid
                        // TODO: this delves too deep into Project structure
                        activeProject.credentialSecretInvalid = true;
                        return when.reject(error);
                    }
                    return when.reject(error);
                }
                // These are encrypted credentials
                try {
                    credentialCache = decryptCredentials(encryptionKey,credentials)
                    clearInvalidFlag = true;
                } catch(err) {
                    credentialCache = {};
                    dirty = true;
                    log.warn(log._("nodes.credentials.error",{message:err.toString()}))
                    var error = new Error("Failed to decrypt credentials");
                    error.code = "credentials_load_failed";
                    if (activeProject) {
                        // This is a project with a bad key. Mark it as invalid
                        // TODO: this delves too deep into Project structure
                        activeProject.credentialSecretInvalid = true;
                        return when.reject(error);
                    }
                    return when.reject(error);
                }
            } else {
                credentialCache = credentials;
            }
            if (clearInvalidFlag) {
                // TODO: this delves too deep into Project structure
                if (activeProject) {
                    delete activeProject.credentialSecretInvalid;
                }
            }
        });
    },

    /**
     * Adds a set of credentials for the given node id.
     * @param id the node id for the credentials
     * @param creds an object of credential key/value pairs
     * @return a promise for backwards compatibility TODO: can this be removed?
     */
    add: function (id, creds) {
        if (!credentialCache.hasOwnProperty(id) || JSON.stringify(creds) !== JSON.stringify(credentialCache[id])) {
            credentialCache[id] = creds;
            dirty = true;
        }
        return when.resolve();
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
        dirty = true;
    },

    clear: function() {
        credentialCache = {};
        dirty = true;
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
            if (n.credentials) {
                api.extract(n);
            }
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
            dirty = true;
        }
        return when.resolve();
    },

    /**
     * Registers a node credential definition.
     * @param type the node type
     * @param definition the credential definition
     */
    register: function (type, definition) {
        var dashedType = type.replace(/\s+/g, '-');
        credentialsDef[dashedType] = definition;
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
            delete node.credentials;
            var savedCredentials = credentialCache[nodeID] || {};
            var dashedType = nodeType.replace(/\s+/g, '-');
            var definition = credentialsDef[dashedType];
            if (!definition) {
                log.warn(log._("nodes.credentials.not-registered",{type:nodeType}));
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
                        dirty = true;
                        continue;
                    }
                    if (!savedCredentials.hasOwnProperty(cred) || JSON.stringify(savedCredentials[cred]) !== JSON.stringify(newCreds[cred])) {
                        savedCredentials[cred] = newCreds[cred];
                        dirty = true;
                    }
                }
            }
            credentialCache[nodeID] = savedCredentials;
        }
    },

    /**
     * Gets the credential definition for the given node type
     * @param type the node type
     * @return the credential definition
     */
    getDefinition: function (type) {
        return credentialsDef[type];
    },

    dirty: function() {
        return dirty;
    },
    setKey: function(key) {
        if (key) {
            encryptionKey = crypto.createHash('sha256').update(key).digest();
            encryptionEnabled = true;
            dirty = true;
            encryptionKeyType = "project";
        } else {
            encryptionKey = null;
            encryptionEnabled = false;
            dirty = true;
            encryptionKeyType = "disabled";
        }
    },
    getKeyType: function() {
        return encryptionKeyType;
    },
    export: function() {
        var result = credentialCache;

        if (encryptionEnabled) {
            if (dirty) {
                try {
                    log.debug("red/runtime/nodes/credentials.export : encrypting");
                    result = encryptCredentials(encryptionKey, credentialCache);
                } catch(err) {
                    log.warn(log._("nodes.credentials.error-saving",{message:err.toString()}))
                }
            } else {
                result = encryptedCredentials;
            }
        }
        dirty = false;
        if (removeDefaultKey) {
            log.debug("red/runtime/nodes/credentials.export : removing unused default key");
            return settings.delete('_credentialSecret').then(function() {
                removeDefaultKey = false;
                return result;
            })
        } else {
            return when.resolve(result);
        }
    }
}
