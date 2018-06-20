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

function Memory(config){
    this.data = {};
}

Memory.prototype.open = function(){
    return Promise.resolve();
};

Memory.prototype.close = function(){
    return Promise.resolve();
};

Memory.prototype.get = function(scope, key) {
    if(!this.data[scope]){
        return undefined;
    }
    return util.getMessageProperty(this.data[scope],key);
};

Memory.prototype.set =function(scope, key, value) {
    if(!this.data[scope]){
        this.data[scope] = {};
    }
    util.setMessageProperty(this.data[scope],key,value);
};

Memory.prototype.keys = function(scope){
    if(!this.data[scope]){
        return [];
    }
    if (scope !== "global") {
        return Object.keys(this.data[scope]);
    } else {
        return Object.keys(this.data[scope]).filter(function (key) {
            return key !== "set" && key !== "get" && key !== "keys" && key !== "setAsync" && key !== "getAsync" && key !== "keysAsync";
        });
    }
};

Memory.prototype.delete = function(scope){
    delete this.data[scope];
    return Promise.resolve();
};

Memory.prototype.clean = function(activeNodes){
    for(var id in this.data){
        if(this.data.hasOwnProperty(id) && id !== "global"){
            var idParts = id.split(":");
            if(activeNodes.indexOf(idParts[0]) === -1){
                delete this.data[id];
            }
        }
    }
    return Promise.resolve();
}

Memory.prototype.setGlobalContext= function(seed){
    this.data["global"] = seed;
};

module.exports = function(config){
    return new Memory(config);
};