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

function generateToken(length) {
    var c = "ABCDEFGHIJKLMNOPQRSTUZWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    var token = [];
    for (var i=0;i<length;i++) {
        token.push(c[Math.floor(Math.random()*c.length)]);
    }
    return token.join("");
}


var storage;
var sessionExpiryTime
var sessions = {};
var loadedSessions = null;
var apiAccessTokens;
var sessionExpiryListeners = [];
var expiryTimeout;

function expireSessions() {
    if (expiryTimeout) {
        clearTimeout(expiryTimeout);
        expiryTimeout = null;
    }
    var nextExpiry = Number.MAX_SAFE_INTEGER;
    var now = Date.now();
    var modified = false;
    for (var t in sessions) {
        if (sessions.hasOwnProperty(t)) {
            var session = sessions[t];
            if (!session.hasOwnProperty("expires") || session.expires < now) {
                sessionExpiryListeners.forEach(listener => { listener(session) })
                delete sessions[t];
                modified = true;
            } else {
                if (session.expires < nextExpiry) {
                    nextExpiry = session.expires;
                }
            }
        }
    }
    if (nextExpiry < Number.MAX_SAFE_INTEGER) {
        // Allow 5 seconds grace
        expiryTimeout = setTimeout(expireSessions,Math.min(2147483647,(nextExpiry - Date.now()) + 5000))
    }
    if (modified) {
        return storage.saveSessions(sessions);
    } else {
        return Promise.resolve();
    }
}
function loadSessions() {
    if (loadedSessions === null) {
        loadedSessions = storage.getSessions().then(function(_sessions) {
             sessions = _sessions||{};
             return expireSessions();
        });
    }
    return loadedSessions;
}

module.exports = {
    init: function(adminAuthSettings, _storage) {
        storage = _storage;

        sessionExpiryListeners = [];

        sessionExpiryTime = adminAuthSettings.sessionExpiryTime || 604800; // 1 week in seconds
        // At this point, storage will not have been initialised, so defer loading
        // the sessions until there's a request for them.
        loadedSessions = null;

        apiAccessTokens = {};
        if ( Array.isArray(adminAuthSettings.tokens) ) {
            apiAccessTokens = adminAuthSettings.tokens.reduce(function(prev, current) {
                prev[current.token] = {
                    user: current.user,
                    scope: current.scope
                };
                return prev;
            }, {});
        }
        return Promise.resolve();
    },
    get: function(token) {
        return loadSessions().then(function() {
            var info = apiAccessTokens[token] || null;

            if (info) {
                return Promise.resolve(info);
            } else {
                if (sessions[token]) {
                    if (sessions[token].expires < Date.now()) {
                        return expireSessions().then(function() { return null });
                    }
                }
                return Promise.resolve(sessions[token]);
            }
        });
    },
    create: function(user,client,scope) {
        return loadSessions().then(function() {
            var accessToken = generateToken(128);

            var accessTokenExpiresAt = Date.now() + (sessionExpiryTime*1000);

            var session = {
                user:user,
                client:client,
                scope:scope,
                accessToken: accessToken,
                expires: accessTokenExpiresAt
            };
            sessions[accessToken] = session;

            if (!expiryTimeout) {
                expiryTimeout = setTimeout(expireSessions,Math.min(2147483647,(accessTokenExpiresAt - Date.now()) + 5000))
            }

            return storage.saveSessions(sessions).then(function() {
                return {
                    accessToken: accessToken,
                    expires_in: sessionExpiryTime
                }
            });
        });
    },
    revoke: function(token) {
        return loadSessions().then(function() {
            delete sessions[token];
            return storage.saveSessions(sessions);
        });
    },
    onSessionExpiry: function(callback) {
        sessionExpiryListeners.push(callback);
    }
}
