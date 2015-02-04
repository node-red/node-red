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
var Sessions;

function generateToken(length) {
    var c = "ABCDEFGHIJKLMNOPQRSTUZWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    var token = [];
    for (var i=0;i<length;i++) {
        token.push(c[Math.floor(Math.random()*c.length)]);
    }
    return token.join("");
}


var sessionModule;

function moduleSelector(aSettings) {
    var toReturn;
    if (aSettings.sessionStorageModule) {
        if (typeof aSettings.sessionStorageModule === "string") {
            // TODO: allow storage modules to be specified by absolute path
            toReturn = require("./"+aSettings.sessionStorageModule);
        } else {
            toReturn = aSettings.sessionStorageModule;
        }
    } else {
        toReturn = require("./localfilesystem");
    }
    return toReturn;
}

module.exports = {
    init: function(settings) {
        sessionModule = moduleSelector(settings);
        sessionModule.init(settings);
    },
    get: function(token) {
        return sessionModule.get(token);
    },
    create: function(user,client,scope) {
        var accessToken = generateToken(128);
        var session = {
            user:user,
            client:client,
            scope:scope,
            accessToken: accessToken,
        };
        return sessionModule.create(accessToken,session).then(function() {
            return {
                accessToken: accessToken,
            }
        });
    },
    revoke: function(token) {
        return sessionModule.delete(token);
    }
}

