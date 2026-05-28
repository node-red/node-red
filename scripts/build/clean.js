const fs = require("fs");
const { cleanBuild } = require("./config");

async function clean() {
    let cleaned = 0;
    for (const target of cleanBuild) {
        if (fs.existsSync(target)) {
            await fs.promises.rm(target, { recursive: true, force: true });
            cleaned++;
        }
    }
    console.log(`clean: ${cleaned} path${cleaned === 1 ? "" : "s"} removed`);
}

if (require.main === module) {
    clean().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = clean;
