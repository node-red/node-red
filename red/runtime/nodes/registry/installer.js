/**
 * Copyright 2015, 2016 IBM Corp.
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
var path = require("path");
var fs = require("fs");

var registry = require("./registry");
var log = require("../../log");

var events = require("../../events");

var child_process = require('child_process');

var settings;

var moduleRe = /^[^/]+$/;
var slashRe = process.platform === "win32" ? /\\|[/]/ : /[/]/;

function init(_settings) {
    settings = _settings;
}

function checkModulePath(folder) {
    var moduleName;
    var err;
    var fullPath = path.resolve(folder);
    var packageFile = path.join(fullPath,'package.json');
    try {
        var pkg = require(packageFile);
        moduleName = pkg.name;
        if (!pkg['node-red']) {
            // TODO: nls
            err = new Error("Invalid Node-RED module");
            err.code = 'invalid_module';
            throw err;
        }
    } catch(err2) {
        err = new Error("Module not found");
        err.code = 404;
        throw err;
    }
    return moduleName;
}

function checkExistingModule(module) {
    if (registry.getModuleInfo(module)) {
        // TODO: nls
        var err = new Error("Module already loaded");
        err.code = "module_already_loaded";
        throw err;
    }
}

function installModule(module) {
    //TODO: ensure module is 'safe'
    return when.promise(function(resolve,reject) {
        var installName = module;

        try {
            if (moduleRe.test(module)) {
                // Simple module name - assume it can be npm installed
            } else if (slashRe.test(module)) {
                // A path - check if there's a valid package.json
                installName = module;
                module = checkModulePath(module);
            }
            checkExistingModule(module);
        } catch(err) {
            return reject(err);
        }
        log.info(log._("server.install.installing",{name: module}));

        var installDir = settings.userDir || process.env.NODE_RED_HOME || ".";
        var child = child_process.execFile('npm',['install','--production',installName],
            {
                cwd: installDir
            },
            function(err, stdin, stdout) {
                if (err) {
                    var lookFor404 = new RegExp(" 404 .*"+installName+"$","m");
                    if (lookFor404.test(stdout)) {
                        log.warn(log._("server.install.install-failed-not-found",{name:module}));
                        var e = new Error("Module not found");
                        e.code = 404;
                        reject(e);
                    } else {
                        log.warn(log._("server.install.install-failed-long",{name:module}));
                        log.warn("------------------------------------------");
                        log.warn(err.toString());
                        log.warn("------------------------------------------");
                        reject(new Error(log._("server.install.install-failed")));
                    }
                } else {
                    log.info(log._("server.install.installed",{name:module}));
                    resolve(require("./index").addModule(module).then(reportAddedModules));
                }
            }
        );
    });
}


function reportAddedModules(info) {
    //comms.publish("node/added",info.nodes,false);
    if (info.nodes.length > 0) {
        log.info(log._("server.added-types"));
        for (var i=0;i<info.nodes.length;i++) {
            for (var j=0;j<info.nodes[i].types.length;j++) {
                log.info(" - "+
                    (info.nodes[i].module?info.nodes[i].module+":":"")+
                    info.nodes[i].types[j]+
                    (info.nodes[i].err?" : "+info.nodes[i].err:"")
                );
            }
        }
    }
    return info;
}

function reportRemovedModules(removedNodes) {
    //comms.publish("node/removed",removedNodes,false);
    log.info(log._("server.removed-types"));
    for (var j=0;j<removedNodes.length;j++) {
        for (var i=0;i<removedNodes[j].types.length;i++) {
            log.info(" - "+(removedNodes[j].module?removedNodes[j].module+":":"")+removedNodes[j].types[i]);
        }
    }
    return removedNodes;
}

function uninstallModule(module) {
    return when.promise(function(resolve,reject) {
        if (/[\s;]/.test(module)) {
            reject(new Error(log._("server.install.invalid")));
            return;
        }
        var installDir = settings.userDir || process.env.NODE_RED_HOME || ".";
        var moduleDir = path.join(installDir,"node_modules",module);

        try {
            fs.statSync(moduleDir);
        } catch(err) {
            return reject(new Error(log._("server.install.uninstall-failed",{name:module})));
        }

        var list = registry.removeModule(module);
        log.info(log._("server.install.uninstalling",{name:module}));
        var child = child_process.execFile('npm',['remove',module],
            {
                cwd: installDir
            },
            function(err, stdin, stdout) {
                if (err) {
                    log.warn(log._("server.install.uninstall-failed-long",{name:module}));
                    log.warn("------------------------------------------");
                    log.warn(err.toString());
                    log.warn("------------------------------------------");
                    reject(new Error(log._("server.install.uninstall-failed",{name:module})));
                } else {
                    log.info(log._("server.install.uninstalled",{name:module}));
                    reportRemovedModules(list);
                    // TODO: tidy up internal event names
                    events.emit("node-module-uninstalled",module)
                    resolve(list);
                }
            }
        );
    });
}

module.exports = {
    init: init,

    installModule: installModule,
    uninstallModule: uninstallModule
}
