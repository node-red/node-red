const fs = require("fs");
const { attachCopyright: targets } = require("./config");

const HEADER =
    "/**\n" +
    " * Copyright OpenJS Foundation and other contributors, https://openjsf.org/\n" +
    " *\n" +
    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
    " * you may not use this file except in compliance with the License.\n" +
    " * You may obtain a copy of the License at\n" +
    " *\n" +
    " * http://www.apache.org/licenses/LICENSE-2.0\n" +
    " *\n" +
    " * Unless required by applicable law or agreed to in writing, software\n" +
    " * distributed under the License is distributed on an \"AS IS\" BASIS,\n" +
    " * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n" +
    " * See the License for the specific language governing permissions and\n" +
    " * limitations under the License.\n" +
    " **/\n";

async function attachToFile(file) {
    if (!fs.existsSync(file)) {
        throw new Error(`attachCopyright: file not found: ${file}`);
    }
    let content = await fs.promises.readFile(file, "utf8");
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    if (content.indexOf(HEADER) !== -1) {
        return false;
    }
    await fs.promises.writeFile(file, HEADER + content);
    return true;
}

async function attachCopyright(group) {
    const groups = group ? [group] : Object.keys(targets);
    for (const g of groups) {
        for (const file of targets[g]) {
            const attached = await attachToFile(file);
            console.log(
                `attachCopyright:${g}: ${attached ? "attached" : "already present"} ${file}`
            );
        }
    }
}

if (require.main === module) {
    attachCopyright(process.argv[2]).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = attachCopyright;
