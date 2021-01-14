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
var os = require("os");
var fs = require("fs-extra");
var tar = require("tar");

var registry = require("./registry");
var library = require("./library");
var log;
var exec;

var events;

var child_process = require('child_process');
var npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
var paletteEditorEnabled = false;

var settings;
const moduleRe = /^(@[^/@]+?[/])?[^/@]+?$/;
const slashRe = process.platform === "win32" ? /\\|[/]/ : /[/]/;
const pkgurlRe = /^(https?|git(|\+https?|\+ssh|\+file)):\/\//;
const localtgzRe = /^([a-zA-Z]:|\/).+tgz$/;

function init(runtime) {
    events = runtime.events;
    settings = runtime.settings;
    log = runtime.log;
    exec = runtime.exec;
}

var activePromise = Promise.resolve();

function checkModulePath(folder) {
    var moduleName;
    var moduleVersion;
    var err;
    var fullPath = path.resolve(folder);
    var packageFile = path.join(fullPath,'package.json');
    try {
        var pkg = require(packageFile);
        moduleName = pkg.name;
        moduleVersion = pkg.version;
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
    return {
        name: moduleName,
        version: moduleVersion
    };
}

function checkExistingModule(module,version) {
    var info = registry.getModuleInfo(module);
    if (info) {
        if (!version || info.version === version) {
            var err = new Error("Module already loaded");
            err.code = "module_already_loaded";
            throw err;
        }
        return true;
    }
    return false;
}

function installModule(module,version,url) {
    if (Buffer.isBuffer(module)) {
        return installTarball(module)
    }
    module = module || "";
    activePromise = activePromise.then(() => {
        //TODO: ensure module is 'safe'
        return new Promise((resolve,reject) => {
            var installName = module;
            var isUpgrade = false;
            try {
                if (url) {
                    if (pkgurlRe.test(url) || localtgzRe.test(url)) {
                        // Git remote url or Tarball url - check the valid package url
                        installName = url;
                    } else {
                        log.warn(log._("server.install.install-failed-url",{name:module,url:url}));
                        const e = new Error("Invalid url");
                        e.code = "invalid_module_url";
                        reject(e);
                        return;
                    }
                } else if (moduleRe.test(module)) {
                    // Simple module name - assume it can be npm installed
                    if (version) {
                        installName += "@"+version;
                    }
                } else if (slashRe.test(module)) {
                    // A path - check if there's a valid package.json
                    installName = module;
                    let info = checkModulePath(module);
                    module = info.name;
                } else {
                    log.warn(log._("server.install.install-failed-name",{name:module}));
                    const e = new Error("Invalid module name");
                    e.code = "invalid_module_name";
                    reject(e);
                    return;
                }
                isUpgrade = checkExistingModule(module,version);
            } catch(err) {
                return reject(err);
            }
            if (!isUpgrade) {
                log.info(log._("server.install.installing",{name: module,version: version||"latest"}));
            } else {
                log.info(log._("server.install.upgrading",{name: module,version: version||"latest"}));
            }

            var installDir = settings.userDir || process.env.NODE_RED_HOME || ".";
            var args = ['install','--no-audit','--no-update-notifier','--no-fund','--save','--save-prefix=~','--production',installName];
            log.trace(npmCommand + JSON.stringify(args));
            exec.run(npmCommand,args,{
                cwd: installDir
            }, true).then(result => {
                if (!isUpgrade) {
                    log.info(log._("server.install.installed",{name:module}));
                    resolve(require("./index").addModule(module).then(reportAddedModules));
                } else {
                    log.info(log._("server.install.upgraded",{name:module, version:version}));
                    events.emit("runtime-event",{id:"restart-required",payload:{type:"warning",text:"notification.warnings.restartRequired"},retain:true});
                    resolve(require("./registry").setModulePendingUpdated(module,version));
                }
            }).catch(result => {
                var output = result.stderr;
                var e;
                var lookFor404 = new RegExp(" 404 .*"+module,"m");
                var lookForVersionNotFound = new RegExp("version not found: "+module+"@"+version,"m");
                if (lookFor404.test(output)) {
                    log.warn(log._("server.install.install-failed-not-found",{name:module}));
                    e = new Error("Module not found");
                    e.code = 404;
                    reject(e);
                } else if (isUpgrade && lookForVersionNotFound.test(output)) {
                    log.warn(log._("server.install.upgrade-failed-not-found",{name:module}));
                    e = new Error("Module not found");
                    e.code = 404;
                    reject(e);
                } else {
                    log.warn(log._("server.install.install-failed-long",{name:module}));
                    log.warn("------------------------------------------");
                    log.warn(output);
                    log.warn("------------------------------------------");
                    reject(new Error(log._("server.install.install-failed")));
                }
            })
        });
    }).catch(err => {
        // In case of error, reset activePromise to be resolvable
        activePromise = Promise.resolve();
        throw err;
    });
    return activePromise;
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

async function getExistingPackageVersion(moduleName) {
    try {
        const packageFilename = path.join(settings.userDir || process.env.NODE_RED_HOME || "." , "package.json");
        const pkg = await fs.readJson(packageFilename);
        if (pkg.dependencies) {
            return pkg.dependencies[moduleName];
        }
    } catch(err) {
    }
    return null;
}

async function installTarball(tarball) {
    // Check this tarball contains a valid node-red module.
    // Get its module name/version
    const moduleInfo = await getTarballModuleInfo(tarball);

    // Write the tarball to <userDir>/nodes/<filename.tgz>
    // where the filename is the normalised form based on module name/version
    let normalisedModuleName = moduleInfo.name[0] === '@'
          ? moduleInfo.name.substr(1).replace(/\//g, '-')
          : moduleInfo.name
    const tarballFile = `${normalisedModuleName}-${moduleInfo.version}.tgz`;
    let tarballPath = path.resolve(path.join(settings.userDir || process.env.NODE_RED_HOME || ".", "nodes", tarballFile));

    // (from fs-extra - move to writeFile with promise once Node 8 dropped)
    await fs.outputFile(tarballPath, tarball);

    // Next, need to check to see if this module is listed in `<userDir>/package.json`
    let existingVersion = await getExistingPackageVersion(moduleInfo.name);
    let existingFile = null;
    let isUpdate = false;

    // If this is a known module, need to check if there will be an old tarball
    // to remove after the install of this one
    if (existingVersion) {
        // - Known module
        if (/^file:nodes\//.test(existingVersion)) {
            existingFile = existingVersion.substring(11);
            isUpdate = true;
            if (tarballFile === existingFile) {
                // Edge case: a tar with the same name has bee uploaded.
                // Carry on with the install, but don't remove the 'old' file
                // as it will have been overwritten by the new one
                existingFile = null;
            }
        }
    }

    // Install the tgz
    return installModule(moduleInfo.name, moduleInfo.version, tarballPath).then(function(info) {
        if (existingFile) {
            // Remove the old file
            return fs.remove(path.resolve(path.join(settings.userDir || process.env.NODE_RED_HOME || ".", "nodes",existingFile))).then(() => info).catch(() => info)
        }
        return info;
    })
}

async function getTarballModuleInfo(tarball) {
    const tarballDir = fs.mkdtempSync(path.join(os.tmpdir(),"nr-tarball-"));
    const removeExtractedTar = function(done) {
        fs.remove(tarballDir, err => {
            done();
        })
    }
    return new Promise((resolve,reject) => {
        var writeStream = tar.x({
            cwd: tarballDir
        }).on('error', err => {
            reject(err);
        }).on('finish', () => {
            try {
                let moduleInfo = checkModulePath(path.join(tarballDir,"package"));
                removeExtractedTar(err => {
                    resolve(moduleInfo);
                })
            } catch(err) {
                removeExtractedTar(() => {
                    reject(err);
                });
            }
        });
        writeStream.end(tarball);
    });
}

function uninstallModule(module) {
    activePromise = activePromise.then(() => {
        return new Promise((resolve,reject) => {
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

            var args = ['remove','--no-audit','--no-update-notifier','--no-fund','--save',module];
            log.trace(npmCommand + JSON.stringify(args));

            exec.run(npmCommand,args,{
                cwd: installDir,
            },true).then(result => {
                log.info(log._("server.install.uninstalled",{name:module}));
                reportRemovedModules(list);
                library.removeExamplesDir(module);
                resolve(list);
            }).catch(result => {
                var output = result.stderr;
                log.warn(log._("server.install.uninstall-failed-long",{name:module}));
                log.warn("------------------------------------------");
                log.warn(output.toString());
                log.warn("------------------------------------------");
                reject(new Error(log._("server.install.uninstall-failed",{name:module})));
            });
        });
    }).catch(err => {
        // In case of error, reset activePromise to be resolvable
        activePromise = Promise.resolve();
        throw err;
    });
    return activePromise;
}

function checkPrereq() {
    if (settings.hasOwnProperty('editorTheme') &&
        settings.editorTheme.hasOwnProperty('palette') &&
        settings.editorTheme.palette.hasOwnProperty('editable') &&
        settings.editorTheme.palette.editable === false
    ) {
        log.info(log._("server.palette-editor.disabled"));
        paletteEditorEnabled = false;
        return Promise.resolve();
    } else {
        return new Promise(resolve => {
            child_process.execFile(npmCommand,['-v'],function(err,stdout) {
                if (err) {
                    log.info(log._("server.palette-editor.npm-not-found"));
                    paletteEditorEnabled = false;
                } else {
                    if (parseInt(stdout.split(".")[0]) < 3) {
                        log.info(log._("server.palette-editor.npm-too-old"));
                        paletteEditorEnabled = false;
                    } else {
                        paletteEditorEnabled = true;
                    }
                }
                resolve();
            });
        })
    }
}

module.exports = {
    init: init,
    checkPrereq: checkPrereq,
    installModule: installModule,
    uninstallModule: uninstallModule,
    paletteEditorEnabled: function() {
        return paletteEditorEnabled
    }
}
