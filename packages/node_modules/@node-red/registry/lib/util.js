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

const path = require("path");
const semver = require("semver");
const url = require("url");
const {events,i18n,log} = require("@node-red/util");

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
    var moduleInfo = require("./index").getModuleInfo(name);
    if (moduleInfo && moduleInfo.path) {
        var relPath = path.relative(__dirname, moduleInfo.path);
        return require(relPath);
    } else {
        // Require it here to avoid the circular dependency
        return require("./externalModules").require(name);
    }
}
function importModule(name) {
    var moduleInfo = require("./index").getModuleInfo(name);
    if (moduleInfo && moduleInfo.path) {
        const moduleFile = url.pathToFileURL(require.resolve(moduleInfo.path));
        return import(moduleFile);
    } else {
        // Require it here to avoid the circular dependency
        return require("./externalModules").import(name);
    }
}

function createNodeApi(node) {
    var red = {
        nodes: {},
        log: {},
        settings: {},
        events: events,
        hooks: runtime.hooks,
        util: runtime.util,
        version: runtime.version,
        require: requireModule,
        import: importModule,
        comms: {
            publish: function(topic,data,retain) {
                events.emit("comms",{
                    topic: topic,
                    data: data,
                    retain: retain
                })
            }
        },
        plugins: {
            registerPlugin: function(id,definition) {
                return runtime.plugins.registerPlugin(node.id,id,definition);
            },
            get: function(id) {
                return runtime.plugins.getPlugin(id);
            },
            getByType: function(type) {
                return runtime.plugins.getPluginsByType(type);
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
    copyObjectProperties(runtime.nodes,red.nodes,["createNode","getNode","eachNode","addCredentials","getCredentials","deleteCredentials"]);
    red.nodes.registerType = function(type,constructor,opts) {
        runtime.nodes.registerType(node.id,type,constructor,opts);
    }
    red.nodes.registerSubflow = function(subflowDef) {
        runtime.nodes.registerSubflow(node.id,subflowDef)
    }
    copyObjectProperties(log,red.log,null,["init"]);
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


function checkAgainstList(module,version,list) {
    for (let i=0;i<list.length;i++) {
        let rule = list[i];
        if (rule.module.test(module)) {
            if (version && rule.version) {
                if (semver.satisfies(version,rule.version)) {
                    return rule;
                }
            } else {
                return rule;
            }
        }
    }
}

function checkModuleAllowed(module,version,allowList,denyList) {
    if (!allowList && !denyList) {
        // Default to allow
        return true;
    }
    if (allowList.length === 0 && denyList.length === 0) {
        return true;
    }

    var allowedRule = checkAgainstList(module,version,allowList);
    var deniedRule = checkAgainstList(module,version,denyList);
    // console.log("A",allowedRule)
    // console.log("D",deniedRule)

    if (allowedRule && !deniedRule) {
        return true;
    }
    if (!allowedRule && deniedRule) {
        return false;
    }
    if (!allowedRule && !deniedRule) {
        return true;
    }
    if (allowedRule.wildcardPos !== deniedRule.wildcardPos) {
        return allowedRule.wildcardPos > deniedRule.wildcardPos
    } else {
        // First wildcard in same position.
        // Go with the longer matching rule. This isn't going to be 100%
        // right, but we are deep into edge cases at this point.
        return allowedRule.module.toString().length > deniedRule.module.toString().length
    }
    return false;
}

function parseModuleList(list) {
    list = list || ["*"];
    return list.map(rule => {
        let m = /^(.+?)(?:@(.*))?$/.exec(rule);
        let wildcardPos = m[1].indexOf("*");
        wildcardPos = wildcardPos===-1?Infinity:wildcardPos;

        return {
            module: new RegExp("^"+m[1].replace(/\*/g,".*")+"$"),
            version: m[2],
            wildcardPos: wildcardPos
        }
    })
}


module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
    },
    createNodeApi: createNodeApi,
    parseModuleList: parseModuleList,
    checkModuleAllowed: checkModuleAllowed
}
