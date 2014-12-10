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

var settings = require("../../settings");
/*
    adminAuth: {
        type: "credentials",
        users: [{
            username: "nol",
            password: "5f4dcc3b5aa765d61d8327deb882cf99" // password
        }],
        anonymous: {}
    },
    
    adminAuth: {
        type: "credentials",
        api: {
            get: function(username) {}
            authenticate: function(username,password) {}
            anonymous: function() {}
        }
*/

//{username:"nick",password:crypto.createHash('md5').update("foo",'utf8').digest('hex')}
var users = {};
var passwords = {};
var anonymousUser = null;

var api = {
    get: function(username) {
        return when.resolve(null);
    },
    authenticate: function(username,password) {
        return when.resolve(null);
    },
    anonymous: function() {
        return when.resolve(null);
    }
}
function init() {
    users = {};
    passwords = {};
    anonymousUser = null;
    if (settings.adminAuth) {
        if (settings.adminAuth.type == "credentials") {
            if (settings.adminAuth.api) {
                api.get = settings.adminAuth.api.get || api.get;
                api.authenticate = settings.adminAuth.api.authenticate || api.authenticate;
                api.anonymous = settings.adminAuth.api.anonymous || api.anonymous;
            } else {
                if (settings.adminAuth.users) {
                    var us = settings.adminAuth.users;
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
                if (settings.adminAuth.anonymous) {
                    anonymousUser = {
                        "anonymous": true,
                        "permissions":settings.adminAuth.anonymous.permissions
                    }
                }
                api = {
                    get: function(username) {
                        return when.resolve(users[username]);
                    },
                    authenticate: function(username,password) {
                        return api.get(username).then(function(user) {
                            if (user) {
                                var pass = crypto.createHash('md5').update(password,'utf8').digest('hex');
                                if (pass == passwords[username]) {
                                    return when.resolve(user);
                                }
                            }
                            return when.resolve(null);
                        });
                    },
                    anonymous: function() {
                        return when.resolve(anonymousUser);
                    }
                }
            }
        }
    }
}
module.exports = {
    init: init,
    get: function(username) { return api.get(username) },
    authenticate: function(username,password) { return api.authenticate(username,password) },
    anonymous: function() { return api.anonymous(); }
};


