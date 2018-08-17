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

var when = require('when');
var fs = require('fs-extra');
var fspath = require("path");

var log = require("@node-red/util").log; // TODO: separate module
var util = require("./util");

var globalSettingsFile;
var globalSettingsBackup;
var settings;

module.exports = {
    init: function(_settings) {
        settings = _settings;
        globalSettingsFile = fspath.join(settings.userDir,".config.json");
        globalSettingsBackup = fspath.join(settings.userDir,".config.json.backup");
    },
    getSettings: function() {
        return when.promise(function(resolve,reject) {
            fs.readFile(globalSettingsFile,'utf8',function(err,data) {
                if (!err) {
                    try {
                        return resolve(util.parseJSON(data));
                    } catch(err2) {
                        log.trace("Corrupted config detected - resetting");
                    }
                }
                return resolve({});
            })
        })
    },
    saveSettings: function(newSettings) {
        if (settings.readOnly) {
            return when.resolve();
        }
        return util.writeFile(globalSettingsFile,JSON.stringify(newSettings,null,1),globalSettingsBackup);
    }
}
