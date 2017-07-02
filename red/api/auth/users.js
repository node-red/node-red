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
var util = require("util");
var bcrypt;
try { bcrypt = require('bcrypt'); }
catch(e) { bcrypt = require('bcryptjs'); }
var users = {};
var passwords = {};
var defaultUser = null;

function authenticate() {
    var username = arguments[0];
    if (typeof username !== 'string') {
        username = username.username;
    }
    var user = users[username];
    if (user) {
        if (arguments.length === 2) {
            // Username/password authentication
            var password = arguments[1];
            return when.promise(function(resolve,reject) {
                bcrypt.compare(password, passwords[username], function(err, res) {
                    resolve(res?user:null);
                });
            });
        } else {
            // Try to extract common profile information
            if (arguments[0].hasOwnProperty('photos') && arguments[0].photos.length > 0) {
                user.image = arguments[0].photos[0].value;
            }
            return when.resolve(user);
        }
    }
    return when.resolve(null);
}
function get(username) {
    return when.resolve(users[username]);
}
function getDefaultUser() {
    return when.resolve(null);
}

var api = {
    get: get,
    authenticate: authenticate,
    default: getDefaultUser
}

function init(config) {
    users = {};
    passwords = {};
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
                    users[u.username] = {
                        "username":u.username,
                        "permissions":u.permissions
                    };
                    passwords[u.username] = u.password;
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
                return when.resolve({
                    "anonymous": true,
                    "permissions":config.default.permissions
                });
            }
        }
    } else {
        api.default = getDefaultUser;
    }
}

module.exports = {
    init: init,
    get: function(username) { return api.get(username) },
    authenticate: function() { return api.authenticate.apply(null, arguments) },
    default: function() { return api.default(); }
};
