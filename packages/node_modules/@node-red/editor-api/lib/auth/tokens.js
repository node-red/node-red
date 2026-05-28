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

const crypto = require("crypto");

var storage;
var sessionExpiryTime
var sessions = {};
const pendingSessions = {};
let exchangeCodeExpiryTime
var loadedSessions = null;
var apiAccessTokens;
var sessionExpiryListeners = [];
var expiryTimeout;
let pendingSessionTimeout

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
function expirePendingSessions() {
    // Pending sessions are short-lived and do not get persisted to storage.
    // We can simply iterate over them in memory to remove expired entries.
    const now = Date.now();
    let activeCount = 0
    for (let code in pendingSessions) {
        if (pendingSessions.hasOwnProperty(code)) {
            const session = pendingSessions[code];
            if (session.exchangeCodeExpires < now) {
                delete pendingSessions[code];
            } else {
                activeCount++
            }
        }
    }
    if (activeCount > 0) {
        // There are still some active pending sessions - so schedule the next check.
        pendingSessionTimeout = setTimeout(expirePendingSessions, 30000);
    } else {
        pendingSessionTimeout = null;
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
        exchangeCodeExpiryTime = adminAuthSettings.exchangeCodeExpiryTime || 20; // 20 seconds
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
    create: function(user, client, scope, useExchangeCode) {
        return loadSessions().then(function() {
            const accessToken = crypto.randomBytes(128).toString('base64');
            const accessTokenExpiresAt = Date.now() + (sessionExpiryTime*1000);

            const session = {
                user:user,
                client:client,
                scope:scope,
                accessToken: accessToken,
                expires: accessTokenExpiresAt,
            };

            if (!expiryTimeout) {
                expiryTimeout = setTimeout(expireSessions,Math.min(2147483647,(accessTokenExpiresAt - Date.now()) + 5000))
            }

            if (useExchangeCode) {
                // This is a short-lived token used to exchange for a longer lived token.
                // Do not save the session to the store until the token is exchanged.
                const exchangeCode = crypto.randomBytes(32).toString('base64');
                session.exchangeCode = exchangeCode;
                session.exchangeCodeExpires = Date.now() + (exchangeCodeExpiryTime * 1000);
                pendingSessions[exchangeCode] = session;
                if (!pendingSessionTimeout) {
                    pendingSessionTimeout = setTimeout(expirePendingSessions, 30000);
                }
                return Promise.resolve({
                    exchangeCode
                });
            } else {
                sessions[accessToken] = session;
                return storage.saveSessions(sessions).then(function() {
                    return {
                        accessToken,
                        expires_in: sessionExpiryTime
                    }
                })
            }
        });
    },
    // Swap a short-lived exchange code for a long-lived access token
    // This can only happen once per exchange code and must be done within 20 seconds of the code being issued.
    exchangeCodeForToken: function(exchangeCode) {
        return loadSessions().then(function () {
            const session = pendingSessions[exchangeCode];
            if (session && session.exchangeCodeExpires > Date.now()) {
                delete pendingSessions[exchangeCode];
                delete session.exchangeCode;
                delete session.exchangeCodeExpires;
                // Save the session to the store now we have validated the exchange code
                sessions[session.accessToken] = session;
                return storage.saveSessions(sessions).then(function() {
                    return {
                        accessToken: session.accessToken,
                        expires_in: sessionExpiryTime
                    }
                })
            } else {
                delete pendingSessions[exchangeCode];
                return Promise.reject(new Error("Invalid exchange code"));
            }
        })

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
