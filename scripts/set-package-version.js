#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const should = require("should");

const rootPackage = path.join(__dirname,"..","package.json");
const packages = [
    "node-red",
    "@node-red/editor-api",
    "@node-red/editor-client",
    "@node-red/nodes",
    "@node-red/registry",
    "@node-red/runtime",
    "@node-red/util"
];
function updatePackage(packageFile, version) {
    let modulePackage = require(packageFile);
    modulePackage.version = version;
    let dependencies = Object.keys(modulePackage.dependencies||{});
    dependencies.forEach(module => {
        if (/^@node-red\//.test(module)) {
            modulePackage.dependencies[module] = version;
        }
    });
    return fs.writeJSON(packageFile,modulePackage,{spaces:4});
}

const targetVersion = process.argv[2];

if (/^\d+\.\d+\.\d+(-.*)?/.test(targetVersion)) {
    let promises = [];
    promises.push(updatePackage(rootPackage,targetVersion));
    packages.forEach(package => {
        promises.push(updatePackage(path.join(__dirname,"../packages/node_modules",package,"package.json"),targetVersion))
    });
    Promise.all(promises).catch(e => {
        console.log(e);
        process.exit(1);
    })
} else {
    console.log("Invalid target version");
    process.exit(1);
}
