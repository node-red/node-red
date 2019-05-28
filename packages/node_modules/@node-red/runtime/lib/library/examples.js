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

var runtime;

function init(_runtime) {
    runtime = _runtime;
}

function getEntry(type,path) {
    var examples = runtime.nodes.getNodeExampleFlows()||{};
    var result = [];
    if (path === "") {
        return Promise.resolve(Object.keys(examples));
    } else {
        path = path.replace(/\/$/,"");
        var parts = path.split("/");
        var module = parts.shift();
        if (module[0] === "@") {
            module = module+"/"+parts.shift();
        }
        if (examples.hasOwnProperty(module)) {
            examples = examples[module];
            examples = parts.reduce(function(ex,k) {
                if (ex) {
                    if (ex.d && ex.d[k]) {
                        return ex.d[k]
                    }
                    if (ex.f && ex.f.indexOf(k) > -1) {
                        return runtime.nodes.getNodeExampleFlowPath(module,parts.join("/"));
                    }
                } else {
                    return null;
                }
            },examples);

            if (!examples) {
                return new Promise(function (resolve,reject) {
                    var error = new Error("not_found");
                    error.code = "not_found";
                    return reject(error);
                });
            } else if (typeof examples === 'string') {
                return new Promise(function(resolve,reject) {
                    try {
                        fs.readFile(examples,'utf8',function(err, data) {
                            runtime.log.audit({event: "library.get",library:"_examples",type:"flow",path:path});
                            if (err) {
                                return reject(err);
                            }
                            return resolve(data);
                        })
                    } catch(err) {
                        return reject(err);
                    }
                });
            } else {
                if (examples.d) {
                    for (var d in examples.d) {
                        if (examples.d.hasOwnProperty(d)) {
                            result.push(d);
                        }
                    }
                }
                if (examples.f) {
                    examples.f.forEach(function(f) {
                        result.push({fn:f})
                    })
                }
                return Promise.resolve(result);
            }
        } else {
            return new Promise(function (resolve,reject) {
                var error = new Error("not_found");
                error.code = "not_found";
                return reject(error);
            });
        }
    }
}

module.exports = {
    name: '_examples_',
    init: init,
    getEntry: getEntry
}
