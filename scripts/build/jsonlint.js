const fs = require("fs");
const fg = require("fast-glob");
const { jsonlint: jsonlintConfig } = require("./config");

async function lintGroup(name, patterns) {
    const files = await fg(patterns, { onlyFiles: true });
    let failed = 0;
    for (const f of files) {
        const content = await fs.promises.readFile(f, "utf8");
        try {
            JSON.parse(content);
        } catch (err) {
            failed++;
            console.error(`jsonlint: ${f}: ${err.message}`);
        }
    }
    if (failed > 0) {
        throw new Error(`jsonlint:${name} - ${failed} of ${files.length} file(s) invalid`);
    }
    console.log(`jsonlint:${name}: ${files.length} file${files.length === 1 ? "" : "s"} lint free`);
}

async function jsonlint() {
    for (const [name, patterns] of Object.entries(jsonlintConfig)) {
        await lintGroup(name, patterns);
    }
}

if (require.main === module) {
    jsonlint().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = jsonlint;
