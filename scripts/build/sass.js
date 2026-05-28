const fs = require("fs");
const path = require("path");
const sass = require("sass");
const { sassBuild } = require("./config");

async function buildSass() {
    const result = sass.compile(sassBuild.src, { style: "compressed" });
    await fs.promises.mkdir(path.dirname(sassBuild.dest), { recursive: true });
    await fs.promises.writeFile(sassBuild.dest, result.css);
    console.log(`sass: ${path.relative(process.cwd(), sassBuild.dest)}`);
}

if (require.main === module) {
    buildSass().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = buildSass;
