#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
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

function verifyDependencies() {
    let failures = [];
    packages.forEach(package => {
        let modulePackage = require(path.join("../packages/node_modules",package,"package.json"));
        let dependencies = Object.keys(modulePackage.dependencies||{});
        dependencies.forEach(module => {
            try {
                if (!/^@node-red\//.test(module)) {
                    should.exist(rootDependencies[module],`[${package}] '${module}' missing from root package.json`);
                    rootDependencies[module].should.eql(modulePackage.dependencies[module],`[${package}] '${module}' version mismatch. Expected '${modulePackage.dependencies[module]}' (got '${rootDependencies[module]}') `);
                }
            } catch(err) {
                failures.push(err.toString());
            }
        });
    })
    return failures;
}

if (require.main === module) {
    let failures = verifyDependencies();
    if (failures.length > 0) {
        failures.forEach(f => console.log(` - ${f}`));
        process.exit(1);
    }
} else {
    module.exports = verifyDependencies;
}
