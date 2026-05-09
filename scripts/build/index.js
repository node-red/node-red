const clean = require("./clean");
const jsonlint = require("./jsonlint");
const concat = require("./concat");
const copy = require("./copy");
const minify = require("./minify");
const sass = require("./sass");
const attachCopyright = require("./attach-copyright");

async function build({ dev = false } = {}) {
    const start = Date.now();
    await clean();
    if (!dev) {
        await jsonlint();
    }
    await concat();
    await copy();
    await sass();
    if (dev) {
        process.env.NODE_ENV = "development";
    } else {
        await minify();
        await attachCopyright();
    }
    const ms = Date.now() - start;
    console.log(`build: done in ${ms} ms${dev ? " (dev)" : ""}`);
}

if (require.main === module) {
    const dev = process.argv.includes("--dev");
    build({ dev }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = build;
