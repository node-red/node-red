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

var path = require("path");
var i18n = require("@node-red/util").i18n;
var registry;
var runtime;

function copyObjectProperties(src,dst,copyList,blockList) {
    if (!src) {
        return;
    }
    if (copyList && !blockList) {
        copyList.forEach(function(i) {
            if (src.hasOwnProperty(i)) {
                var propDescriptor = Object.getOwnPropertyDescriptor(src,i);
                Object.defineProperty(dst,i,propDescriptor);
            }
        });
    } else if (!copyList && blockList) {
        for (var i in src) {
            if (src.hasOwnProperty(i) && blockList.indexOf(i) === -1) {
                var propDescriptor = Object.getOwnPropertyDescriptor(src,i);
                Object.defineProperty(dst,i,propDescriptor);
            }
        }
    }
}
function requireModule(name) {
    var moduleInfo = registry.getModuleInfo(name);
    if (moduleInfo && moduleInfo.path) {
        var relPath = path.relative(__dirname, moduleInfo.path);
        return require(relPath);
    } else {
        var err = new Error(`Cannot find module '${name}'`);
        err.code = "MODULE_NOT_FOUND";
        throw err;
    }
}

function createNodeApi(node) {
    var red = {
        nodes: {},
        log: {},
        settings: {},
        events: runtime.events,
        util: runtime.util,
        version: runtime.version,
        require: requireModule,
        comms: {
            publish: function(topic,data,retain) {
                runtime.events.emit("comms",{
                    topic: topic,
                    data: data,
                    retain: retain
                })
            }
        },
        library: {
            register: function(type) {
                return runtime.library.register(node.id,type);
            }
        },
        httpNode: runtime.nodeApp,
        httpAdmin: runtime.adminApp,
        server: runtime.server
    }
    copyObjectProperties(runtime.nodes,red.nodes,["createNode","getNode","eachNode","addCredentials","getCredentials","deleteCredentials" ]);
    red.nodes.registerType = function(type,constructor,opts) {
        runtime.nodes.registerType(node.id,type,constructor,opts);
    }
    copyObjectProperties(runtime.log,red.log,null,["init"]);
    copyObjectProperties(runtime.settings,red.settings,null,["init","load","reset"]);
    if (runtime.adminApi) {
        red.auth = runtime.adminApi.auth;
    } else {
        //TODO: runtime.adminApi is always stubbed if not enabled, so this block
        // is unused - but may be needed for the unit tests
        red.auth = {
            needsPermission: function(v) { return function(req,res,next) {next()} }
        };
        // TODO: stub out httpAdmin/httpNode/server
    }
    red["_"] = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        if (args[0].indexOf(":") === -1) {
            args[0] = node.namespace+":"+args[0];
        }
        return i18n._.apply(null,args);
    }
    return red;
}

module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        registry = require("@node-red/registry/lib");
    },
    createNodeApi: createNodeApi
}
