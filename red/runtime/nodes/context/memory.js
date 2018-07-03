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

Memory.prototype.get = function(scope, key, callback) {
    var value;
    try{
        if(this.data[scope]){
            value = util.getMessageProperty(this.data[scope], key);
        }
    }catch(err){
        if(callback){
            callback(err);
        }else{
            throw err;
        }
    }
    if(callback){
        callback(null, value);
    } else {
        return value;
    }
};

Memory.prototype.set =function(scope, key, value, callback) {
    if(!this.data[scope]){
        this.data[scope] = {};
    }
    try{
        util.setMessageProperty(this.data[scope],key,value);
    }catch(err){
        if(callback){
            callback(err);
        }else{
            throw err;
        }
    }
    if(callback){
        callback(null);
    }
};

Memory.prototype.keys = function(scope, callback){
    var values = [];
    try{
        if(this.data[scope]){
            if (scope !== "global") {
                values = Object.keys(this.data[scope]);
            } else {
                values = Object.keys(this.data[scope]).filter(function (key) {
                    return key !== "set" && key !== "get" && key !== "keys";
                });
            }
        }
    }catch(err){
        if(callback){
            callback(err);
        }else{
            throw err;
        }
    }
    if(callback){
        callback(null, values);
    } else {
        return values;
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

Memory.prototype._export = function() {
    return this.data;
}


module.exports = function(config){
    return new Memory(config);
};
