const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");

const PACKAGES = [
    "node-red",
    "@node-red/editor-api",
    "@node-red/editor-client",
    "@node-red/nodes",
    "@node-red/registry",
    "@node-red/runtime",
    "@node-red/util"
];

function npmPack(packagePath, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn("npm", ["pack", packagePath], {
            cwd,
            stdio: ["ignore", "pipe", "inherit"]
        });
        let stdout = "";
        proc.stdout.on("data", (b) => (stdout += b.toString()));
        proc.on("error", reject);
        proc.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`npm pack ${packagePath} exited ${code}`));
            } else {
                resolve(stdout.trim().split(/\r?\n/).pop());
            }
        });
    });
}

async function packModules(distDir) {
    const modulesDir = path.join(distDir, "modules");
    const fs = require("fs");
    await fs.promises.mkdir(modulesDir, { recursive: true });

    for (const name of PACKAGES) {
        const packagePath = path.join(ROOT, "packages/node_modules", name);
        const tgz = await npmPack(packagePath, modulesDir);
        console.log(`pack: ${name} -> ${tgz}`);
    }
}

if (require.main === module) {
    packModules(path.join(ROOT, ".dist")).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = packModules;
