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

var when = require("when");
var fs = require("fs");
var path = require("path");
var semver = require("semver");

var localfilesystem = require("./localfilesystem");
var registry = require("./registry");
var registryUtil = require("./util")
var i18n = require("@node-red/util").i18n;

var settings;
var runtime;

function init(_runtime) {
    runtime = _runtime;
    settings = runtime.settings;
    localfilesystem.init(runtime);
    registryUtil.init(runtime);
}

function load(disableNodePathScan) {
    // To skip node scan, the following line will use the stored node list.
    // We should expose that as an option at some point, although the
    // performance gains are minimal.
    //return loadNodeFiles(registry.getModuleList());
    runtime.log.info(runtime.log._("server.loading"));

    var nodeFiles = localfilesystem.getNodeFiles(disableNodePathScan);
    return loadNodeFiles(nodeFiles);
}

function loadNodeFiles(nodeFiles) {
    var promises = [];
    var nodes = [];
    for (var module in nodeFiles) {
        /* istanbul ignore else */
        if (nodeFiles.hasOwnProperty(module)) {
            if (nodeFiles[module].redVersion &&
                !semver.satisfies(runtime.version().replace(/(\-[1-9A-Za-z-][0-9A-Za-z-\.]*)?(\+[0-9A-Za-z-\.]+)?$/,""), nodeFiles[module].redVersion)) {
                //TODO: log it
                runtime.log.warn("["+module+"] "+runtime.log._("server.node-version-mismatch",{version:nodeFiles[module].redVersion}));
                nodeFiles[module].err = "version_mismatch";
                continue;
            }
            if (module == "node-red" || !registry.getModuleInfo(module)) {
                var first = true;
                for (var node in nodeFiles[module].nodes) {
                    /* istanbul ignore else */
                    if (nodeFiles[module].nodes.hasOwnProperty(node)) {
                        if (module != "node-red" && first) {
                            // Check the module directory exists
                            first = false;
                            var fn = nodeFiles[module].nodes[node].file;
                            var parts = fn.split("/");
                            var i = parts.length-1;
                            for (;i>=0;i--) {
                                if (parts[i] == "node_modules") {
                                    break;
                                }
                            }
                            var moduleFn = parts.slice(0,i+2).join("/");

                            try {
                                var stat = fs.statSync(moduleFn);
                            } catch(err) {
                                // Module not found, don't attempt to load its nodes
                                break;
                            }
                        }

                        try {
                            promises.push(loadNodeConfig(nodeFiles[module].nodes[node]).then((function() {
                                var m = module;
                                var n = node;
                                return function(nodeSet) {
                                    nodeFiles[m].nodes[n] = nodeSet;
                                    nodes.push(nodeSet);
                                }
                            })()));
                        } catch(err) {
                            //
                        }
                    }
                }
            }
        }
    }
    return when.settle(promises).then(function(results) {
        for (var module in nodeFiles) {
            if (nodeFiles.hasOwnProperty(module)) {
                if (!nodeFiles[module].err) {
                    registry.addModule(nodeFiles[module]);
                }
            }
        }
        return loadNodeSetList(nodes);
    });
}

function loadNodeConfig(fileInfo) {
    return new Promise(function(resolve) {
        var file = fileInfo.file;
        var module = fileInfo.module;
        var name = fileInfo.name;
        var version = fileInfo.version;

        var id = module + "/" + name;
        var info = registry.getNodeInfo(id);
        var isEnabled = true;
        if (info) {
            if (info.hasOwnProperty("loaded")) {
                throw new Error(file+" already loaded");
            }
            isEnabled = info.enabled;
        }

        var node = {
            id: id,
            module: module,
            name: name,
            file: file,
            template: file.replace(/\.js$/,".html"),
            enabled: isEnabled,
            loaded:false,
            version: version,
            local: fileInfo.local
        };
        if (fileInfo.hasOwnProperty("types")) {
            node.types = fileInfo.types;
        }

        fs.readFile(node.template,'utf8', function(err,content) {
            if (err) {
                node.types = [];
                if (err.code === 'ENOENT') {
                    if (!node.types) {
                        node.types = [];
                    }
                    node.err = "Error: "+node.template+" does not exist";
                } else {
                    node.types = [];
                    node.err = err.toString();
                }
                resolve(node);
            } else {
                var types = [];

                var regExp = /<script (?:[^>]*)data-template-name\s*=\s*['"]([^'"]*)['"]/gi;
                var match = null;

                while ((match = regExp.exec(content)) !== null) {
                    types.push(match[1]);
                }
                node.types = types;

                var langRegExp = /^<script[^>]* data-lang\s*=\s*['"](.+?)['"]/i;
                regExp = /(<script[^>]* data-help-name=[\s\S]*?<\/script>)/gi;
                match = null;
                var mainContent = "";
                var helpContent = {};
                var index = 0;
                while ((match = regExp.exec(content)) !== null) {
                    mainContent += content.substring(index,regExp.lastIndex-match[1].length);
                    index = regExp.lastIndex;
                    var help = content.substring(regExp.lastIndex-match[1].length,regExp.lastIndex);

                    var lang = i18n.defaultLang;
                    if ((match = langRegExp.exec(help)) !== null) {
                        lang = match[1];
                    }
                    if (!helpContent.hasOwnProperty(lang)) {
                        helpContent[lang] = "";
                    }

                    helpContent[lang] += help;
                }
                mainContent += content.substring(index);

                node.config = mainContent;
                node.help = helpContent;
                // TODO: parse out the javascript portion of the template
                //node.script = "";
                for (var i=0;i<node.types.length;i++) {
                    if (registry.getTypeId(node.types[i])) {
                        node.err = node.types[i]+" already registered";
                        break;
                    }
                }
                if (node.module === 'node-red') {
                    // do not look up locales directory for core nodes
                    node.namespace = node.module;
                    resolve(node);
                    return;
                }
                fs.stat(path.join(path.dirname(file),"locales"),function(err,stat) {
                    if (!err) {
                        node.namespace = node.id;
                        i18n.registerMessageCatalog(node.id,
                                path.join(path.dirname(file),"locales"),
                                path.basename(file,".js")+".json")
                            .then(function() {
                                resolve(node);
                            });
                    } else {
                        node.namespace = node.module;
                        resolve(node);
                    }
                });
            }
        });
    });
}

/**
 * Loads the specified node into the runtime
 * @param node a node info object - see loadNodeConfig
 * @return a promise that resolves to an update node info object. The object
 *         has the following properties added:
 *            err: any error encountered whilst loading the node
 *
 */
function loadNodeSet(node) {
    var nodeDir = path.dirname(node.file);
    var nodeFn = path.basename(node.file);
    if (!node.enabled) {
        return Promise.resolve(node);
    } else {
    }
    try {
        var loadPromise = null;
        var r = require(node.file);
        if (typeof r === "function") {

            var red = registryUtil.createNodeApi(node);
            var promise = r(red);
            if (promise != null && typeof promise.then === "function") {
                loadPromise = promise.then(function() {
                    node.enabled = true;
                    node.loaded = true;
                    return node;
                }).catch(function(err) {
                    node.err = err;
                    return node;
                });
            }
        }
        if (loadPromise == null) {
            node.enabled = true;
            node.loaded = true;
            loadPromise = Promise.resolve(node);
        }
        return loadPromise;
    } catch(err) {
        node.err = err;
        var stack = err.stack;
        var message;
        if (stack) {
            var i = stack.indexOf(node.file);
            if (i > -1) {
                var excerpt = stack.substring(i+node.file.length+1,i+node.file.length+20);
                var m = /^(\d+):(\d+)/.exec(excerpt);
                if (m) {
                    node.err = err+" (line:"+m[1]+")";
                }
            }
        }
        return Promise.resolve(node);
    }
}

function loadNodeSetList(nodes) {
    var promises = [];
    nodes.forEach(function(node) {
        if (!node.err) {
            promises.push(loadNodeSet(node));
        } else {
            promises.push(node);
        }
    });

    return when.settle(promises).then(function() {
        if (settings.available()) {
            return registry.saveNodeList();
        } else {
            return;
        }
    });
}

function addModule(module) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var nodes = [];
    if (registry.getModuleInfo(module)) {
        // TODO: nls
        var e = new Error("module_already_loaded");
        e.code = "module_already_loaded";
        return Promise.reject(e);
    }
    try {
        var moduleFiles = localfilesystem.getModuleFiles(module);
        return loadNodeFiles(moduleFiles);
    } catch(err) {
        return Promise.reject(err);
    }
}

function loadNodeHelp(node,lang) {
    var base = path.basename(node.template);
    var localePath;
    if (node.module === 'node-red') {
        var cat_dir = path.dirname(node.template);
        var cat = path.basename(cat_dir);
        var dir = path.dirname(cat_dir);
        localePath = path.join(dir, "..", "locales", lang, cat, base)
    }
    else {
        var dir = path.dirname(node.template);
        localePath = path.join(dir,"locales",lang,base);
    }
    try {
        // TODO: make this async
        var content = fs.readFileSync(localePath, "utf8")
        return content;
    } catch(err) {
        return null;
    }
}

function getNodeHelp(node,lang) {
    if (!node.help[lang]) {
        var help = loadNodeHelp(node,lang);
        if (help == null) {
            var langParts = lang.split("-");
            if (langParts.length == 2) {
                help = loadNodeHelp(node,langParts[0]);
            }
        }
        if (help) {
            node.help[lang] = help;
        } else if (lang === i18n.defaultLang) {
            return null;
        } else {
            node.help[lang] = getNodeHelp(node, i18n.defaultLang);
        }
    }
    return node.help[lang];
}

module.exports = {
    init: init,
    load: load,
    addModule: addModule,
    loadNodeSet: loadNodeSet,
    getNodeHelp: getNodeHelp
}
