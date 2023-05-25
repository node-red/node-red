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
var apiUtils = require("../util");
var runtimeAPI;
var sshkeys = require("./sshkeys");

module.exports = {
    init: function(settings, _runtimeAPI) {
        runtimeAPI = _runtimeAPI;
        sshkeys.init(settings, runtimeAPI);
    },
    userSettings: function(req, res) {
        var opts = {
            user: req.user
        }
        runtimeAPI.settings.getUserSettings(opts).then(function(result) {
            res.json(result);
        });
    },
    updateUserSettings: function(req,res) {
        var opts = {
            user: req.user,
            settings: req.body
        }
        runtimeAPI.settings.updateUserSettings(opts).then(function(result) {
            res.status(204).end();
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        });
    },
    sshkeys: function() {
        return sshkeys.app()
    }
}
