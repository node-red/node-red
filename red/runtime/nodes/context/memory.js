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

var util = require("../../util");

var data;
var seedFlg = false;

var memory = {
    init: function(config) {
        data = {};
    },
    get: function(key, scope) {
        if(!data[scope]){
            data[scope] = {};
        }
        return util.getMessageProperty(data[scope],key);
    },
    set: function(key, value, scope) {
        if(!data[scope]){
            data[scope] = {};
        }
        util.setMessageProperty(data[scope],key,value);
    },
    keys: function(scope){
        if(!data[scope]){
            data[scope] = {};
        }
        var keysData = Object.keys(data[scope]);
        if (scope !== "global") {
            return keysData;
        } else {
            return keysData.filter(function (key) {
                return key !== "set" && key !== "get" && key !== "keys";
            });
        }
    },
    delete: function(scope){
        delete data[scope];
    },
    setGlobalContext: function(seed){
        data["global"] = seed;
    }
};

module.exports = memory;