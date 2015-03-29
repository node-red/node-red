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

var util = require('util');

var readRE = /^((.+)\.)?read$/
var writeRE = /^((.+)\.)?write$/

function hasPermission(userScope,permission) {
    var i;
    if (util.isArray(userScope)) {
        if (userScope.length === 0) {
            return false;
        }
        for (i=0;i<userScope.length;i++) {
            if (!hasPermission(userScope[i],permission)) {
                return false;
            }
        }
        return true;
    }
    
    if (userScope == "*") {
        return true;
    }
    
    if (util.isArray(permission)) {
        for (i=0;i<permission.length;i++) {
            if (!hasPermission(userScope,permission[i])) {
                return false;
            }
        }
        return true;
    }
    
    if (userScope == "read") {
        return readRE.test(permission);
    } else {
        return false; // anything not allowed is disallowed
    }
}

module.exports = {
    hasPermission: hasPermission,
}
