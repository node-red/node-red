const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const { minify: minifyConfig } = require("./config");

async function minifyOne({ src, dest }) {
    if (!fs.existsSync(src)) {
        throw new Error(`minify: source not found: ${src}`);
    }
    const code = await fs.promises.readFile(src, "utf8");
    const result = await esbuild.transform(code, {
        minify: true,
        legalComments: "none",
        target: "es2020"
    });
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, result.code);
}

async function minify() {
    let totalIn = 0;
    let totalOut = 0;
    for (const target of minifyConfig) {
        await minifyOne(target);
        totalIn += fs.statSync(target.src).size;
        totalOut += fs.statSync(target.dest).size;
    }
    const mb = (b) => (b / 1024 / 1024).toFixed(2);
    console.log(
        `minify: ${minifyConfig.length} files, ${mb(totalIn)} MB -> ${mb(totalOut)} MB`
    );
}

if (require.main === module) {
    minify().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = minify;
