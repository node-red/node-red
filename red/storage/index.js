/**
 * Copyright 2013 IBM Corp.
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
 
 
var settings = require('../red').settings;

var mod;

if (settings.storageModule) {
    if (typeof settings.storageModule === "string") {
        // TODO: allow storage modules to be specified by absolute path
        mod = require("./"+settings.storageModule);
    } else {
        mod = settings.storageModule;
    }
} else {
    mod = require("./localfilesystem");
}

module.exports = mod;

