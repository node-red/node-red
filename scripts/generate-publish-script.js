#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const should = require("should");

const LATEST = "3";

function generateScript() {
    return new Promise((resolve, reject) => {
        const packages = [
            "@node-red/util",
            "@node-red/runtime",
            "@node-red/registry",
            "@node-red/nodes",
            "@node-red/editor-client",
            "@node-red/editor-api",
            "node-red"
        ];
        const rootPackage = require(path.join(__dirname,"..","package.json"));
        const version = rootPackage.version;

        const versionParts = version.split(".");
        let updateNextToLatest = false;
        let tagArg = "";
        if (versionParts[0] !== LATEST) {
            tagArg = `--tag v${versionParts[0]}-maintenance`
        } else if (/-/.test(version))  {
            tagArg = "--tag next"
        } else {
            updateNextToLatest = true;
        }

        const lines = [];

        packages.forEach(name => {
            const tarName = name.replace(/@/,"").replace(/\//,"-")
            lines.push(`npm publish ${tarName}-${version}.tgz ${tagArg}\n`);
            if (updateNextToLatest) {
                lines.push(`npm dist-tag add ${name}@${version} next\n`);
            }
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
