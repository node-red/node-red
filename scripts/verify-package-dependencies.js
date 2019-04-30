#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const should = require("should");

const rootPackage = require(path.join("..","package.json"));
const rootDependencies = rootPackage.dependencies;
const packages = [
    "node-red",
    "@node-red/editor-api",
    "@node-red/editor-client",
    "@node-red/nodes",
    "@node-red/registry",
    "@node-red/runtime",
    "@node-red/util"
];

const fixFlag = process.argv[2] === '--fix';

function verifyDependencies() {
    let failures = [];
    let packageUpdates = {};
    packages.forEach(package => {
        let modulePackage = require(path.join("../packages/node_modules",package,"package.json"));
        let dependencies = Object.keys(modulePackage.dependencies||{});
        dependencies.forEach(module => {
            try {
                if (!/^@node-red\//.test(module)) {
                    should.exist(rootDependencies[module],`[${package}] '${module}' missing from root package.json`);
                    try {
                        rootDependencies[module].should.eql(modulePackage.dependencies[module],`[${package}] '${module}' version mismatch. Expected '${modulePackage.dependencies[module]}' (got '${rootDependencies[module]}') `);
                    } catch(err) {
                        if (fixFlag) {
                            modulePackage.dependencies[module] = rootDependencies[module];
                            packageUpdates[package] = modulePackage;
                        } else {
                            failures.push(err.toString());
                        }
                    }
                }
            } catch(err) {
                failures.push(err.toString());
            }
        });
    })
    if (failures.length === 0 && fixFlag) {
        var promises = [];
        packages.forEach(package => {
            if (packageUpdates.hasOwnProperty(package)) {
                promises.push(fs.writeJSON(path.join(__dirname,"../packages/node_modules",package,"package.json"),packageUpdates[package],{spaces:4}));
            }
        });
        return Promise.all(promises).then(r => []).catch(e => {
            console.log(e);
            process.exit(1);
        })
    } else {
        return Promise.resolve(failures);
    }
}

if (require.main === module) {
    verifyDependencies().then(failures => {
        if (failures.length > 0) {
            failures.forEach(f => console.log(` - ${f}`));
            console.log("Run with --fix option to fix up versions")
            process.exit(1);
        }
    }).catch(e => {
        console.log(e);
        process.exit(1);
    });
} else {
    module.exports = verifyDependencies;
}
