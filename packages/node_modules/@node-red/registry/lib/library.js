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

var fs = require('fs');
var fspath = require('path');

var runtime;

var exampleRoots = {};
var exampleFlows = null;

function getFlowsFromPath(path) {
    return new Promise(function(resolve,reject) {
        var result = {};
        fs.readdir(path,function(err,files) {
            var promises = [];
            var validFiles = [];
            files.forEach(function(file) {
                var fullPath = fspath.join(path,file);
                var stats = fs.lstatSync(fullPath);
                if (stats.isDirectory()) {
                    validFiles.push(file);
                    promises.push(getFlowsFromPath(fullPath));
                } else if (/\.json$/.test(file)){
                    validFiles.push(file);
                    promises.push(Promise.resolve(file.split(".")[0]))
                }
            })
            var i=0;
            Promise.all(promises).then(function(results) {
                results.forEach(function(r) {
                    if (typeof r === 'string') {
                        result.f = result.f||[];
                        result.f.push(r);
                    } else {
                        result.d = result.d||{};
                        result.d[validFiles[i]] = r;
                    }
                    i++;
                })
                resolve(result);
            })
        });
    })
}

function addNodeExamplesDir(module,path) {
    exampleRoots[module] = path;
    return getFlowsFromPath(path).then(function(result) {
        if (JSON.stringify(result).indexOf('{"f":') === -1) { return; }
        exampleFlows = exampleFlows||{};
        exampleFlows[module] = result;
    });
}
function removeNodeExamplesDir(module) {
    delete exampleRoots[module];
    if (exampleFlows) {
        delete exampleFlows[module];
    }
    if (exampleFlows && Object.keys(exampleFlows).length === 0) {
        exampleFlows = null;
    }
}

function init() {
    exampleRoots = {};
    exampleFlows = null;
}

function getExampleFlows() {
    return exampleFlows;
}

function getExampleFlowPath(module,path) {
    if (exampleRoots[module]) {
        return fspath.join(exampleRoots[module],path)+".json";
    }
    return null;
}

module.exports = {
    init: init,
    addExamplesDir: addNodeExamplesDir,
    removeExamplesDir: removeNodeExamplesDir,
    getExampleFlows: getExampleFlows,
    getExampleFlowPath: getExampleFlowPath
}
