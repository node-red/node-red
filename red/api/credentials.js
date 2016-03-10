/**
 * Copyright 2015 IBM Corp.
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

var log;
var api;

module.exports = {
    init: function(runtime) {
        log = runtime.log;
        api = runtime.nodes;
    },
    get: function (req, res) {
        // TODO: It should verify the given node id is of the type specified -
        //       but that would add a dependency from this module to the
        //       registry module that knows about node types.
        var nodeType = req.params.type;
        var nodeID = req.params.id;
        log.audit({event: "credentials.get",type:nodeType,id:nodeID},req);
        var credentials = api.getCredentials(nodeID);
        if (!credentials) {
            res.json({});
            return;
        }
        var definition = api.getCredentialDefinition(nodeType);

        var sendCredentials = {};
        for (var cred in definition) {
            if (definition.hasOwnProperty(cred)) {
                if (definition[cred].type == "password") {
                    var key = 'has_' + cred;
                    sendCredentials[key] = credentials[cred] != null && credentials[cred] !== '';
                    continue;
                }
                sendCredentials[cred] = credentials[cred] || '';
            }
        }
        res.json(sendCredentials);
    }
}
