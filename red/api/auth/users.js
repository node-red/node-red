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
var crypto = require("crypto");
var util = require("util");
/*
    adminAuth: {
        type: "credentials",
        users: [{
            username: "nol",
            password: "5f4dcc3b5aa765d61d8327deb882cf99" // password
            permissions: "* read write"
        }],
        default: {
            permissions: "* read write"
        }
    },
    
    adminAuth: {
        type: "credentials",
        users: function(username) {return when.resolve(user)},
        authenticate: function(username,password) { return when.resolve(user);}
        default: function() { return when.resolve(defaultUser) }
    }
*/

//{username:"nick",password:crypto.createHash('md5').update("foo",'utf8').digest('hex')}

var users = {};
var passwords = {};
var defaultUser = null;

function authenticate(username,password) {
    var user = users[username];
    if (user) {
        var pass = crypto.createHash('md5').update(password,'utf8').digest('hex');
        if (pass == passwords[username]) {
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
    if (config.type == "credentials") {
        if (config.users) {
            if (typeof config.users === "function") {
                api.get = config.users;
            } else {
                var us = config.users;
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
    authenticate: function(username,password) { return api.authenticate(username,password) },
    default: function() { return api.default(); }
};


