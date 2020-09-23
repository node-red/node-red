const fs = require("fs");

const newVersion = require("../../package.json").version;

if (process.env.GITHUB_REF !== "refs/tags/"+newVersion) {
    console.log(`GITHUB_REF doesn't match the package.json version: ${process.env.GITHUB_REF} !== ${newVersion}`);
    process.exit(0);
}

if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.log(`Not updating for a non-stable release - ${newVersion}`);
    process.exit(0);
}

const path = __dirname+"/../../../node-red.github.io/index.html";
let contents = fs.readFileSync(path, "utf8");
contents = contents.replace(/<span class="node-red-latest-version">v\d+\.\d+\.\d+<\/span>/, `<span class="node-red-latest-version">v${newVersion}<\/span>` );
fs.writeFileSync(path, contents);