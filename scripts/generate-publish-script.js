#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const should = require("should");

function generateScript() {
    return new Promise((resolve, reject) => {
        const packages = [
            "node-red-util",
            "node-red-runtime",
            "node-red-registry",
            "node-red-nodes",
            "node-red-editor-client",
            "node-red-editor-api",
            "node-red"
        ];
        const rootPackage = require(path.join(__dirname,"..","package.json"));
        const version = rootPackage.version;

        const tagArg = /-/.test(version) ? "--tag next" : ""

        const lines = [];

        packages.forEach(name => {
            lines.push(`npm publish ${name}-${version}.tgz ${tagArg}\n`);
        })
        resolve(lines.join(""))
    });
}

if (require.main === module) {
    generateScript().then(output => {
        console.log(output);
    });
} else {
    module.exports = generateScript;
}
