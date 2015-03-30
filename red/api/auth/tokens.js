/**
 * Copyright 2015 IBM Corp.
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

function expireSessions() {
    var now = Date.now();
    var modified = false;
    for (var t in sessions) {
        if (sessions.hasOwnProperty(t)) {
            var session = sessions[t];
            if (!session.hasOwnProperty("expires") || session.expires < now) {
                delete sessions[t];
                modified = true;
            }
        }
    }
    if (modified) {
        return storage.saveSessions(sessions);
    } else {
        return when.resolve();
    }
}

module.exports = {
    init: function(adminAuthSettings, _storage) {
        storage = _storage;
        
        sessionExpiryTime = adminAuthSettings.sessionExpiryTime || 604800; // 1 week in seconds
        
        return storage.getSessions().then(function(_sessions) {
             sessions = _sessions||{};
             return expireSessions();
        });
    },
    get: function(token) {
        if (sessions[token]) {
            if (sessions[token].expires < Date.now()) {
                return expireSessions().then(function() { return null });
            }
        }
        return when.resolve(sessions[token]);
    },
    create: function(user,client,scope) {
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
        return storage.saveSessions(sessions).then(function() {
            return {
                accessToken: accessToken,
                expires_in: sessionExpiryTime
            }
        });
    },
    revoke: function(token) {
        delete sessions[token];
        return storage.saveSessions(sessions);
    }
}

