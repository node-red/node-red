const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const fse = require("fs-extra");
const { copy: copyConfig } = require("./config");

async function copyFile(src, dest) {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fse.copy(src, dest, { dereference: false });
}

async function copyEntry(entry) {
    if (entry.src && !entry.glob) {
        if (!fs.existsSync(entry.src)) {
            console.log(`copy: source not found, skipping: ${entry.src}`);
            return 0;
        }
        await copyFile(entry.src, entry.dest);
        return 1;
    }

    const cwd = entry.cwd;
    if (!fs.existsSync(cwd)) {
        console.log(`copy: cwd not found, skipping: ${cwd}`);
        return 0;
    }
    const patterns = Array.isArray(entry.glob) ? entry.glob : [entry.glob];
    const matches = await fg(patterns, { cwd, onlyFiles: true, dot: false });
    for (const rel of matches) {
        await copyFile(path.join(cwd, rel), path.join(entry.dest, rel));
    }
    return matches.length;
}

async function copy() {
    let total = 0;
    for (const entry of copyConfig) {
        total += await copyEntry(entry);
    }
    console.log(`copy: ${total} files copied`);
}

if (require.main === module) {
    copy().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = copy;
