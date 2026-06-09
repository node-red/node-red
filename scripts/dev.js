const path = require("path");
const chokidar = require("chokidar");
const nodemon = require("nodemon");

const build = require("./build");
const concat = require("./build/concat");
const copy = require("./build/copy");
const sass = require("./build/sass");
const jsonlint = require("./build/jsonlint");

const ROOT = path.resolve(__dirname, "..");
const EDITOR_SRC = path.join(
    ROOT,
    "packages/node_modules/@node-red/editor-client/src"
);

function parseArgs(argv) {
    const out = { passthrough: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--flowFile") {
            out.flowFile = argv[++i];
        } else if (a === "--userDir") {
            out.userDir = argv[++i];
        } else if (a === "--browserstack") {
            process.env.BROWSERSTACK = "true";
        } else if (a === "--non-headless") {
            process.env.NODE_RED_NON_HEADLESS = "true";
        } else {
            out.passthrough.push(a);
        }
    }
    return out;
}

function debounce(fn, ms = 300) {
    let timer = null;
    let pending = false;
    return () => {
        if (timer) {
            pending = true;
            return;
        }
        timer = setTimeout(async () => {
            timer = null;
            try {
                await fn();
            } catch (err) {
                console.error(err);
            }
            if (pending) {
                pending = false;
                fn().catch((e) => console.error(e));
            }
        }, ms);
    };
}

/**
 * Watch a directory for file changes. Note that chokidar no longer supports globs or wildcards
 * @param {*} label 
 * @param {*} patterns 
 * @param {*} handler 
 */
function watchPath(label, patterns, handler) {
    const onChange = debounce(async () => {
        console.log(`[watch:${label}] change detected`);
        await handler();
    });
    chokidar
        .watch(patterns, { ignoreInitial: true })
        .on("add", onChange)
        .on("change", onChange)
        .on("unlink", onChange);
}

function startNodemon(scriptArgs) {
    nodemon({
        script: "packages/node_modules/node-red/red.js",
        args: scriptArgs,
        ext: "js,html,json",
        verbose: false,
        watch: ["packages/node_modules"],
        ignore: ["packages/node_modules/@node-red/editor-client/*"]
    });
    nodemon.on("log", (event) => {
        console.log(event.colour);
    });
    nodemon.on("quit", () => process.exit(0));
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    await build({ dev: false });
    process.env.NODE_ENV = "development";

    const scriptArgs = [];
    if (opts.flowFile) {
        scriptArgs.push(opts.flowFile);
        process.env.NODE_RED_ENABLE_PROJECTS = "false";
    }
    if (opts.userDir) {
        scriptArgs.push("-u", opts.userDir);
    }
    scriptArgs.push(...opts.passthrough);

    watchPath(
        "js",
        path.join(EDITOR_SRC, "js"),
        async () => {
            await concat();
            await copy();
        }
    );
    watchPath("sass", path.join(EDITOR_SRC, "sass"), () => sass());
    watchPath(
        "json",
        [
            path.join(ROOT, "packages/node_modules/@node-red/nodes/locales"),
            path.join(ROOT, "packages/node_modules/@node-red/editor-client/locales"),
            path.join(ROOT, "packages/node_modules/@node-red/runtime/locales")
        ],
        () => jsonlint()
    );
    watchPath(
        "keymaps",
        path.join(EDITOR_SRC, "js/keymap.json"),
        async () => {
            await jsonlint();
            await copy();
        }
    );
    watchPath("tours", path.join(EDITOR_SRC, "tours"), () => copy());
    watchPath("misc", path.join(ROOT, "CHANGELOG.md"), () => copy());

    startNodemon(scriptArgs);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
