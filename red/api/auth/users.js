/**
* Copyright 2014 IBM Corp.
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

//{username:"nick",password:crypto.createHash('md5').update("foo",'utf8').digest('hex')}
var users = {};
var passwords = {};
var api = {};

if (settings.adminAuth) {
    if (settings.adminAuth.type == "credentials") {
        if (settings.adminAuth.users) {
            if (util.isArray(settings.adminAuth.users)) {
                for (var i=0;i<settings.adminAuth.users.length;i++) {
                    var u = settings.adminAuth.users[i];
                    users[u.username] = {
                        "username":u.username
                    };
                    passwords[u.username] = u.password;
                }
                var api = {
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
                    }
                }
            } else {
                api = settings.adminAuth.users;
            }
        }
    }
}

module.exports = api;


