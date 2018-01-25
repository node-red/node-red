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

var util = require("util");
var clone = require("clone");
var bcrypt;
try { bcrypt = require('bcrypt'); }
catch(e) { bcrypt = require('bcryptjs'); }
var users = {};
var defaultUser = null;

function authenticate() {
    var username = arguments[0];
    if (typeof username !== 'string') {
        username = username.username;
    }
    const args = Array.from(arguments);
    return api.get(username).then(function(user) {
        if (user) {
            if (args.length === 2) {
                // Username/password authentication
                var password = args[1];
                return new Promise(function(resolve,reject) {
                    bcrypt.compare(password, user.password, function(err, res) {
                        resolve(res?cleanUser(user):null);
                    });
                });
            } else {
                // Try to extract common profile information
                if (args[0].hasOwnProperty('photos') && args[0].photos.length > 0) {
                    user.image = args[0].photos[0].value;
                }
                return cleanUser(user);
            }
        }
        return null;
    });
}
function get(username) {
    return Promise.resolve(users[username]);
}
function getDefaultUser() {
    return Promise.resolve(null);
}

var api = {
    get: get,
    authenticate: authenticate,
    default: getDefaultUser
}

function init(config) {
    users = {};
    defaultUser = null;
    if (config.type == "credentials" || config.type == "strategy") {
        if (config.users) {
            if (typeof config.users === "function") {
                api.get = config.users;
            } else {
                var us = config.users;
                /* istanbul ignore else */
                if (!util.isArray(us)) {
                    us = [us];
                }
                for (var i=0;i<us.length;i++) {
                    var u = us[i];
                    users[u.username] = clone(u);
                }
            }
        }
        if (config.authenticate && typeof config.authenticate === "function") {
            api.authenticate = config.authenticate;
        } else {
            api.authenticate = authenticate;
        }
    }
    if (config.default) {
        if (typeof config.default === "function") {
            api.default = config.default;
        } else {
            api.default = function() {
                return Promise.resolve({
                    "anonymous": true,
                    "permissions":config.default.permissions
                });
            }
        }
    } else {
        api.default = getDefaultUser;
    }
}
function cleanUser(user) {
    if (user && user.hasOwnProperty('password')) {
        user = clone(user);
        delete user.password;
    }
    return user;
}

module.exports = {
    init: init,
    get: function(username) { return api.get(username).then(cleanUser)},
    authenticate: function() { return api.authenticate.apply(null, arguments) },
    default: function() { return api.default(); }
};
