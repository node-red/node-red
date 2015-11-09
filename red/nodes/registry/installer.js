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


var when = require("when");
var path = require("path");
var fs = require("fs");

var registry = require("./registry");
var log = require("../../log");

var events = require("../../events");

var child_process = require('child_process');

var settings;

function init(_settings) {
    settings = _settings;
}

function installModule(module) {
    //TODO: ensure module is 'safe'
    return when.promise(function(resolve,reject) {
        if (/[\s;]/.test(module)) {
            reject(new Error(log._("server.install.invalid")));
            return;
        }
        if (registry.getModuleInfo(module)) {
            // TODO: nls
            var err = new Error("Module already loaded");
            err.code = "module_already_loaded";
            reject(err);
            return;
        }
        log.info(log._("server.install.installing",{name: module}));

        var installDir = settings.userDir || process.env.NODE_RED_HOME || ".";
        var child = child_process.execFile('npm',['install','--production',module],
            {
                cwd: installDir
            },
            function(err, stdin, stdout) {
                if (err) {
                    var lookFor404 = new RegExp(" 404 .*"+module+"$","m");
                    if (lookFor404.test(stdout)) {
                        log.warn(log._("server.install.install-failed-not-found",{name:module}));
                        var e = new Error();
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
        if (!fs.existsSync(moduleDir)) {
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
