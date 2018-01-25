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

var authCache = {}

module.exports = {
    init: function() {
        authCache = {};
    },
    clear: function(project,remote, user) {
        if (user && remote && authCache[project] && authCache[project][remote]) {
            delete authCache[project][remote][user];
        } else if (remote && authCache.hasOwnProperty(project)) {
            delete authCache[project][remote];
        } else {
            delete authCache[project];
        }
    },
    set: function(project,remote,user,auth) {
         // console.log("AuthCache.set",remote,user,auth);
        authCache[project] = authCache[project]||{};
        authCache[project][remote] = authCache[project][remote]||{};
        authCache[project][remote][user] = auth;
        // console.log(JSON.stringify(authCache,'',4));
    },
    get: function(project,remote,user) {
        // console.log("AuthCache.get",remote,user,authCache[project]&&authCache[project][remote]&&authCache[project][remote][user]);
        if (authCache[project] && authCache[project][remote]) {
            return authCache[project][remote][user];
        }
        return
    }
}
