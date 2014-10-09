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

var path = require("path");
var fs = require("fs");

var userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

var configDir = path.join(userHome,".nodered");
var configFile = path.join(configDir,"config.json");

var config;

function load() {
    if (config == null) {
        try {
            config = JSON.parse(fs.readFileSync(configFile));
        } catch(err) {
            config = {};
        }
    }
}

function save() {
    try {
        fs.mkdirSync(configDir);
    } catch(err) {
        if (err.code != "EEXIST") {
            throw err;
        }
    }
    fs.writeFileSync(configFile,JSON.stringify(config,null,4));
}
module.exports = {
    unload: function() {
        config = null;
    }
};
module.exports.__defineGetter__('target',function() { load(); return config.target|| "http://localhost:1880" });
module.exports.__defineSetter__('target',function(v) { load(); config.target = v; save();});
