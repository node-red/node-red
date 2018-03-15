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

var storage = require('node-persist');
var fs = require('fs-extra');
var fspath = require("path");

var configs;
var storagePath;
var fileStorages;

function createStorage(path) {
    var fileStorage = storage.create({dir: fspath.join(storagePath,path)});
    fileStorage.initSync();
    fileStorages[path] = fileStorage;
}

var localfilesystem = {
    init: function(_configs) {
        configs = _configs;
        fileStorages = {};
        if (!configs.dir) {
            try {
                fs.statSync(fspath.join(process.env.NODE_RED_HOME,".config.json"));
                storagePath = fspath.join(process.env.NODE_RED_HOME,"contexts");
            } catch(err) {
                try {
                    // Consider compatibility for older versions
                    if (process.env.HOMEPATH) {
                        fs.statSync(fspath.join(process.env.HOMEPATH,".node-red",".config.json"));
                        storagePath = fspath.join(process.env.HOMEPATH,".node-red","contexts");
                    }
                } catch(err) {
                }
                if (!configs.dir) {
                    storagePath = fspath.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || process.env.NODE_RED_HOME,".node-red","contexts");
                }
            }
        }else{
            storagePath = configs.dir;
        }
        
    },
    stop: function() {
        return when.resolve();
    },
    get: function (key, flowId) {
        if(!fileStorages[flowId]){
            createStorage(flowId);
        }
        return fileStorages[flowId].getItemSync(key);
    },

    set: function (key, value, flowId) {
        if(!fileStorages[flowId]){
            createStorage(flowId);
        }
        fileStorages[flowId].setItemSync(key, value);
    },
    keys: function (flowId) {
        if(!fileStorages[flowId]){
            createStorage(flowId);
        }
        return fileStorages[flowId].keys();
    }
};

module.exports = localfilesystem;
