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

var util = require("util");

var credentials = {};
var storage = null;

module.exports = {
    init: function(_storage) {
        storage = _storage;
    },
    load: function() {
        return storage.getCredentials().then(function(creds) {
            credentials = creds;
        }).otherwise(function(err) {
            util.log("[red] Error loading credentials : "+err);
        });
    },
    add: function(id,creds) {
        credentials[id] = creds;
        storage.saveCredentials(credentials);
    },

    get: function(id) {
        return credentials[id];
    },
    
    delete: function(id) {
        delete credentials[id];
        storage.saveCredentials(credentials);
    },
    
    clean: function(getNode) {
        var deletedCredentials = false;
        for (var c in credentials) {
            var n = getNode(c);
            console.log(c,n)
            if (!n) {
                deletedCredentials = true;
                delete credentials[c];
            }
        }
        if (deletedCredentials) {
            storage.saveCredentials(credentials);
        }
 
    }
}
