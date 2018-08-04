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

/**
 * Local file-system based context storage
 *
 * Configuration options:
 * {
 *    base: "contexts",        // the base directory to use
 *                             // default: "contexts"
 *    dir: "/path/to/storage", // the directory to create the base directory in
 *                             // default: settings.userDir
 *    cache: true              // whether to cache contents in memory
 *                             // default: true
 *  }
 *
 *
 *  $HOME/.node-red/contexts
 *  ├── global
 *  │     └── global_context.json
 *  ├── <id of Flow 1>
 *  │     ├── flow_context.json
 *  │     ├── <id of Node a>.json
 *  │     └── <id of Node b>.json
 *  └── <id of Flow 2>
 *         ├── flow_context.json
 *         ├── <id of Node x>.json
 *         └── <id of Node y>.json
 */

var fs = require('fs-extra');
var path = require("path");
var util = require("../../util");

var MemoryStore = require("./memory");

function getStoragePath(storageBaseDir, scope) {
    if(scope.indexOf(":") === -1){
        if(scope === "global"){
            return path.join(storageBaseDir,"global",scope);
        }else{ // scope:flow
            return path.join(storageBaseDir,scope,"flow");
        }
    }else{ // scope:local
        var ids = scope.split(":")
        return path.join(storageBaseDir,ids[1],ids[0]);
    }
}

function getBasePath(config) {
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

function loadFile(storagePath){
    return fs.pathExists(storagePath).then(function(exists){
        if(exists === true){
            return fs.readFile(storagePath, "utf8");
        }else{
            return Promise.resolve(undefined);
        }
    }).catch(function(err){
        throw Promise.reject(err);
    });
}

function LocalFileSystem(config){
    this.config = config;
    this.storageBaseDir = getBasePath(this.config);
    if (config.hasOwnProperty('cache')?config.cache:true) {
        this.cache = MemoryStore({});
    }
}

LocalFileSystem.prototype.open = function(){
    var self = this;
    if (this.cache) {
        var scopes = [];
        var promises = [];
        var subdirs = [];
        var subdirPromises = [];
        return fs.readdir(self.storageBaseDir).then(function(dirs){
            dirs.forEach(function(fn) {
                var p = getStoragePath(self.storageBaseDir ,fn)+".json";
                scopes.push(fn);
                promises.push(loadFile(p));
                subdirs.push(path.join(self.storageBaseDir,fn));
                subdirPromises.push(fs.readdir(path.join(self.storageBaseDir,fn)));
            })
            return Promise.all(subdirPromises);
        }).then(function(dirs) {
            dirs.forEach(function(files,i) {
                files.forEach(function(fn) {
                    if (fn !== 'flow.json' && fn !== 'global.json') {
                        scopes.push(fn.substring(0,fn.length-5)+":"+scopes[i]);
                        promises.push(loadFile(path.join(subdirs[i],fn)))
                    }
                });
            })
            return Promise.all(promises);
        }).then(function(res) {
            scopes.forEach(function(scope,i) {
                var data = res[i]?JSON.parse(res[i]):{};
                Object.keys(data).forEach(function(key) {
                    self.cache.set(scope,key,data[key]);
                })
            });
        }).catch(function(err){
            if(err.code == 'ENOENT') {
                return fs.ensureDir(self.storageBaseDir);
            }else{
                return Promise.reject(err);
            }
        });
    } else {
        return Promise.resolve();
    }
}

LocalFileSystem.prototype.close = function(){
    return Promise.resolve();
}

LocalFileSystem.prototype.get = function(scope, key, callback) {
    if (this.cache) {
        return this.cache.get(scope,key,callback);
    }
    if(typeof callback !== "function"){
        throw new Error("Callback must be a function");
    }
    var storagePath = getStoragePath(this.storageBaseDir ,scope);
    loadFile(storagePath + ".json").then(function(data){
        if(data){
            data = JSON.parse(data);
            if (!Array.isArray(key)) {
                callback(null, util.getObjectProperty(data,key));
            } else {
                var results = [undefined];
                for (var i=0;i<key.length;i++) {
                    results.push(util.getObjectProperty(data,key[i]))
                }
                callback.apply(null,results);
            }
        }else{
            callback(null, undefined);
        }
    }).catch(function(err){
        callback(err);
    });
};

LocalFileSystem.prototype.set = function(scope, key, value, callback) {
    var storagePath = getStoragePath(this.storageBaseDir ,scope);
    if (this.cache) {
        this.cache.set(scope,key,value,callback);
        // With cache enabled, no need to re-read the file prior to writing.
        var newContext = this.cache._export()[scope];
        fs.outputFile(storagePath + ".json", JSON.stringify(newContext, undefined, 4), "utf8").catch(function(err) {
        });
    } else if (callback && typeof callback !== 'function') {
        throw new Error("Callback must be a function");
    } else {
        loadFile(storagePath + ".json").then(function(data){
            var obj = data ? JSON.parse(data) : {}
            if (!Array.isArray(key)) {
                key = [key];
                value = [value];
            } else if (!Array.isArray(value)) {
                // key is an array, but value is not - wrap it as an array
                value = [value];
            }
            for (var i=0;i<key.length;i++) {
                var v = null;
                if (i<value.length) {
                    v = value[i];
                }
                util.setObjectProperty(obj,key[i],v);
            }
            return fs.outputFile(storagePath + ".json", JSON.stringify(obj, undefined, 4), "utf8");
        }).then(function(){
            if(typeof callback === "function"){
                callback(null);
            }
        }).catch(function(err){
            if(typeof callback === "function"){
                callback(err);
            }
        });
    }
};

LocalFileSystem.prototype.keys = function(scope, callback){
    if (this.cache) {
        return this.cache.keys(scope,callback);
    }
    if(typeof callback !== "function"){
        throw new Error("Callback must be a function");
    }
    var storagePath = getStoragePath(this.storageBaseDir ,scope);
    loadFile(storagePath + ".json").then(function(data){
        if(data){
            callback(null, Object.keys(JSON.parse(data)));
        }else{
            callback(null, []);
        }
    }).catch(function(err){
        callback(err);
    });
};

LocalFileSystem.prototype.delete = function(scope){
    var cachePromise;
    if (this.cache) {
        cachePromise = this.cache.delete(scope);
    } else {
        cachePromise = Promise.resolve();
    }
    var that = this;
    return cachePromise.then(function() {
        var storagePath = getStoragePath(that.storageBaseDir,scope);
        return fs.remove(storagePath + ".json");
    });
}

LocalFileSystem.prototype.clean = function(activeNodes){
    var self = this;
    var cachePromise;
    if (this.cache) {
        cachePromise = this.cache.clean(activeNodes);
    } else {
        cachePromise = Promise.resolve();
    }
    return cachePromise.then(function() {
        return fs.readdir(self.storageBaseDir).then(function(dirs){
            return Promise.all(dirs.reduce(function(result, item){
                if(item !== "global" && activeNodes.indexOf(item) === -1){
                    result.push(fs.remove(path.join(self.storageBaseDir,item)));
                }
                return result;
            },[]));
        }).catch(function(err){
            if(err.code == 'ENOENT') {
                return Promise.resolve();
            }else{
                return Promise.reject(err);
            }
        });
    });
}

module.exports = function(config){
    return new LocalFileSystem(config);
};
