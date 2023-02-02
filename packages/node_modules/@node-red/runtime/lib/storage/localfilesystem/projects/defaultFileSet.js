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

var i18n = require("@node-red/util").i18n;

module.exports = {
    "package.json": function(project) {
        var packageDetails = {
            "name": project.name,
            "description": project.summary||i18n._("storage.localfilesystem.projects.summary"),
            "version": "0.0.1",
            "dependencies": {},
            "node-red": {
                "settings": {
                }
            }
        };
        if (project.files) {
            if (project.files.flow) {
                packageDetails['node-red'].settings.flowFile = project.files.flow;
                packageDetails['node-red'].settings.credentialsFile = project.files.credentials;
            }
        }
        return JSON.stringify(packageDetails,"",4);
    },
    "README.md": function(project) {
        var content = project.name+"\n"+("=".repeat(project.name.length))+"\n\n";
        if (project.summary) {
            content += project.summary+"\n\n";
        }
        content += i18n._("storage.localfilesystem.projects.readme");
        return content;
    },
    ".gitignore": function() { return "*.backup" ;}
}
