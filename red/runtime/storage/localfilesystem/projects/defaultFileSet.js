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


var fspath = require("path");

function getCredentialsFilename(filename) {
    // TODO: DRY - ./index.js
    var ffDir = fspath.dirname(filename);
    var ffExt = fspath.extname(filename);
    var ffBase = fspath.basename(filename,ffExt);
    return fspath.join(ffDir,ffBase+"_cred"+ffExt);
}


module.exports = {
    "package.json": function(project) {
        var package = {
            "name": project.name,
            "description": project.summary||"A Node-RED Project",
            "version": "0.0.1",
            "dependencies": {},
            "node-red": {
                "settings": {
                }
            }
        };
        if (project.files) {
            if (project.files.flow) {
                package['node-red'].settings.flowFile = project.files.flow;
                package['node-red'].settings.credentialsFile = getCredentialsFilename(project.files.flow);
            }
        }
        return JSON.stringify(package,"",4);
    },
    "README.md": function(project) {
        return project.name+"\n"+("=".repeat(project.name.length))+"\n\n"+(project.summary||"A Node-RED Project")+"\n\n";
    },
    "settings.json": function() { return "{}" },
    // "flow.json": function() { return "[]" },
    // "flow_cred.json": function() { return "{}" },
    ".gitignore": function() { return "*.backup" ;}
}
