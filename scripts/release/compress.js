const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const archiver = require("archiver");

const ROOT = path.resolve(__dirname, "..", "..");

async function compress(distDir) {
    const pkg = require(path.join(ROOT, "package.json"));
    const archivePath = path.join(distDir, `node-red-${pkg.version}.zip`);
    await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });

    const cwd = path.join(ROOT, "packages/node_modules");
    const files = await fg(["**"], {
        cwd,
        ignore: ["@node-red/editor-client/src/**"],
        onlyFiles: true,
        dot: false
    });

    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(archivePath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        out.on("close", () => {
            console.log(
                `compress: ${files.length} files -> ${path.relative(ROOT, archivePath)} (${archive.pointer()} bytes)`
            );
            resolve(archivePath);
        });
        archive.on("error", reject);
        archive.pipe(out);
        for (const rel of files) {
            archive.file(path.join(cwd, rel), { name: rel });
        }
        archive.finalize();
    });
}

if (require.main === module) {
    compress(path.join(ROOT, ".dist")).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = compress;
