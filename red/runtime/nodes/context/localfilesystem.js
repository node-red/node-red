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

var JsonDB = require('node-json-db');
var fs = require('fs-extra');
var path = require("path");

var configs;
var storageBaseDir;
var storages;

function createStorage(scope) {
    var i = scope.indexOf(":")
    
    if(i === -1){
        if(scope === "global"){
            storages[scope] = new JsonDB(path.join(storageBaseDir,"global",scope), true, true); 
        }else{ // scope:flow
            storages[scope] = new JsonDB(path.join(storageBaseDir,scope,"flow"), true, true);
        }
    }else{ // scope:local
        var ids = scope.split(":")
        storages[scope] = new JsonDB(path.join(storageBaseDir,ids[1],ids[0]), true, true);
    }
}

var localfilesystem = {
    init: function(_configs) {
        configs = _configs;
        storages = {};
        if (!configs.dir) {
            if(configs.settings && configs.settings.userDir){
                storageBaseDir = path.join(configs.settings.userDir,"contexts");
            }else{
                try {
                    fs.statSync(path.join(process.env.NODE_RED_HOME,".config.json"));
                    storageBaseDir = path.join(process.env.NODE_RED_HOME,"contexts");
                } catch(err) {
                    try {
                        // Consider compatibility for older versions
                        if (process.env.HOMEPATH) {
                            fs.statSync(path.join(process.env.HOMEPATH,".node-red",".config.json"));
                            storageBaseDir = path.join(process.env.HOMEPATH,".node-red","contexts");
                        }
                    } catch(err) {
                    }
                    if (!storageBaseDir) {
                        storageBaseDir = path.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || process.env.NODE_RED_HOME,".node-red","contexts");
                    }
                }
            }
        }else{
            storageBaseDir = configs.dir;
        }
    },
    get: function (key, scope) {
        if(!storages[scope]){
            createStorage(scope);
        }
        try{
            storages[scope].reload();
            return storages[scope].getData("/" + key.replace(/\./g,"/"));
        }catch(err){
            if(err.name === "DataError"){
                return undefined;
            }else{
                throw err;
            }
        }
    },

    set: function (key, value, scope) {
        if(!storages[scope]){
            createStorage(scope);
        }
        if(value){
            storages[scope].push("/" + key.replace(/\./g,"/"), value);
        }else{
            storages[scope].delete("/" + key.replace(/\./g,"/"));
        }
    },
    keys: function (scope) {
        if(!storages[scope]){
            return [];
        }
        return Object.keys(storages[scope].getData("/"));
    },
    delete: function(scope){
        if(storages[scope]){
            storages[scope].delete("/");
            if(scope.indexOf(":") === -1){
                fs.removeSync(path.dirname(storages[scope].filename));
            }else{
                try{
                    fs.statSync(storages[scope].filename);
                    fs.unlinkSync(storages[scope].filename);
                }catch(err){
                    console.log("deleted");
                }
            }
            delete storages[scope];
        }
    }
};

module.exports = localfilesystem;
