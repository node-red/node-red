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
var when = require("when");

function createStorage(storageBaseDir, scope) {
    if(scope.indexOf(":") === -1){
        if(scope === "global"){
            return new JsonDB(path.join(storageBaseDir,"global",scope), true, true); 
        }else{ // scope:flow
            return new JsonDB(path.join(storageBaseDir,scope,"flow"), true, true);
        }
    }else{ // scope:local
        var ids = scope.split(":")
        return new JsonDB(path.join(storageBaseDir,ids[1],ids[0]), true, true);
    }
}

function getStoragePath(config) {
    var base = config.base || "contexts";
    var storageBaseDir;
    if (!config.dir) {
        if(config.settings && config.settings.userDir){
            storageBaseDir = path.join(config.settings.userDir, base);
        }else{
            try {
                fs.statSync(path.join(process.env.NODE_RED_HOME,".config.json"));
                storageBaseDir = path.join(process.env.NODE_RED_HOME, base);
            } catch(err) {
                try {
                    // Consider compatibility for older versions
                    if (process.env.HOMEPATH) {
                        fs.statSync(path.join(process.env.HOMEPATH,".node-red",".config.json"));
                        storageBaseDir = path.join(process.env.HOMEPATH, ".node-red", base);
                    }
                } catch(err) {
                }
                if (!storageBaseDir) {
                    storageBaseDir = path.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || process.env.NODE_RED_HOME,".node-red", base);
                }
            }
        }
    }else{
        storageBaseDir = path.join(config.dir, base);
    }
    return storageBaseDir;
}

function LocalFileSystem(config){
    this.config = config;
    this.storageBaseDir = getStoragePath(this.config);
    this.storages = {};
}

LocalFileSystem.prototype.open = function(){
    return when.resolve();
}

LocalFileSystem.prototype.close = function(){
    return when.resolve();
}

LocalFileSystem.prototype.get = function (scope, key) {
    if(!this.storages[scope]){
        this.storages[scope] = createStorage(this.storageBaseDir ,scope);
    }
    try{
        this.storages[scope].reload();
        return this.storages[scope].getData("/" + key.replace(/\./g,"/"));
    }catch(err){
        if(err.name === "DataError"){
            return undefined;
        }else{
            throw err;
        }
    }
}

LocalFileSystem.prototype.set = function(scope, key, value) {
    if(!this.storages[scope]){
        this.storages[scope] = createStorage(this.storageBaseDir ,scope);
    }
    if(value){
        this.storages[scope].push("/" + key.replace(/\./g,"/"), value);
    }else{
        this.storages[scope].delete("/" + key.replace(/\./g,"/"));
    }
}

LocalFileSystem.prototype.keys = function(scope) {
    if(!this.storages[scope]){
        this.storages[scope] = createStorage(this.storageBaseDir ,scope);
    }
    return Object.keys(this.storages[scope].getData("/"));
}

LocalFileSystem.prototype.delete = function(scope){
    var self = this;
    if(this.storages[scope]){
        var promise;
        this.storages[scope].delete("/");
        return fs.remove(this.storages[scope].filename).then(function(){
            delete self.storages[scope];
            return when.resolve();
        });
    }else{
        return when.resolve();
    }
}

LocalFileSystem.prototype.clean = function(activeNodes){
    var self = this;
    return fs.readdir(self.storageBaseDir).then(function(dirs){
        return when.all(dirs.reduce(function(result, item){
            if(item !== "global" && !activeNodes.includes(item)){
                result.push(fs.remove(path.join(self.storageBaseDir,item)));
                delete self.storages[item];
            }
            return result;
        },[]));
    });
 }

module.exports = function(config){
    return new LocalFileSystem(config);
};

