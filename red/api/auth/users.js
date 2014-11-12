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

var settings = require("../../settings");

//{username:"nick",password:crypto.createHash('md5').update("foo",'utf8').digest('hex')}
var users = [];

if (settings.adminAuth) {
    if (settings.adminAuth.user && settings.adminAuth.pass) {
        users.push({username:settings.adminAuth.user, password:settings.adminAuth.pass});
    }
}

module.exports = {
    get: function(username) {
        for (var i=0;i<users.length;i++) {
            if (users[i].username == username) {
                return when.resolve(users[i]);
            }
        }
        return when.resolve(null);
    }
}
