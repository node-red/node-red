const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const build = require("../build");
const verifyDependencies = require("../verify-package-dependencies");
const generatePublishScript = require("../generate-publish-script");
const compress = require("./compress");
const packModules = require("./pack-modules");

const ROOT = path.resolve(__dirname, "..", "..");
const DIST = path.join(ROOT, ".dist");

const CHMOD_TARGETS = {
    "0755": [
        "packages/node_modules/@node-red/nodes/core/hardware/nrgpio",
        "packages/node_modules/@node-red/runtime/lib/storage/localfilesystem/projects/git/node-red-*sh"
    ]
};

async function verifyDeps() {
    let failures = await verifyDependencies("dependencies");
    failures = failures.concat(await verifyDependencies("optionalDependencies"));
    if (failures.length > 0) {
        failures.forEach((f) => console.error(` - ${f}`));
        throw new Error("Failed to verify package dependencies");
    }
    console.log("verify-deps: ok");
}

async function chmodRelease() {
    for (const [mode, patterns] of Object.entries(CHMOD_TARGETS)) {
        const matches = await fg(patterns, { cwd: ROOT, onlyFiles: true });
        for (const rel of matches) {
            await fs.promises.chmod(path.join(ROOT, rel), parseInt(mode, 8));
            console.log(`chmod ${mode}: ${rel}`);
        }
    }
}

async function writePublishScript() {
    const output = await generatePublishScript();
    const scriptPath = path.join(DIST, "modules", "publish.sh");
    await fs.promises.writeFile(scriptPath, output);
    console.log(`publish-script: ${path.relative(ROOT, scriptPath)}`);
}

async function release() {
    await build({ dev: false });
    await verifyDeps();
    await fs.promises.rm(DIST, { recursive: true, force: true });
    await fs.promises.mkdir(path.join(DIST, "modules"), { recursive: true });
    await chmodRelease();
    await compress(DIST);
    await packModules(DIST);
    await writePublishScript();
    console.log("release: done");
}

if (require.main === module) {
    release().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = release;
