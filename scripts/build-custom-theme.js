#!/usr/bin/env node

// This script can be used to build custom colour-scheme css files.
//
// 1. Create a copy of packages/node_modules/@node-red/editor-client/src/sass/colors.scss
//    and change the values to the desired colours.
//
// 2. Run this script, providing the path to the custom file using the --in option
//
// 3. Save the output of the script to a file - either redirect its output,
//    or use the --out option.
//
// 4. Edit your settings file to set the theme:
//       editorTheme: {
//           page: {
//               css: "/path/to/file/generated/by/this/script"
//           }
//       }
//
// 5. Restart Node-RED
//



const os = require("os");
const nopt = require("nopt");
const path = require("path");
const fs = require("fs-extra");
const sass = require("sass");

const knownOpts = {
    "help": Boolean,
    "long": Boolean,
    "in": [path],
    "out": [path]
};
const shortHands = {
    "?":["--help"]
};
nopt.invalidHandler = function(k,v,t) {}

const parsedArgs = nopt(knownOpts,shortHands,process.argv,2)

if (parsedArgs.help) {
    console.log("Usage: build-custom-theme [-?] [--in FILE] [--out FILE]");
    console.log("");
    console.log("Options:");
    console.log("  --in  FILE  Custom colors sass file");
    console.log("  --out FILE  Where you write the result");
    console.log("  --long      Do not compress the output");
    console.log("  -?, --help  Show this help");
    console.log("");
    process.exit();
}


const ruleRegex = /(\$.*?) *: *(\S[\S\s]*?);/g;
var match;

const customColors = {};

if (parsedArgs.in && fs.existsSync(parsedArgs.in)) {
    let customColorsFile = fs.readFileSync(parsedArgs.in,"utf-8");
    while((match = ruleRegex.exec(customColorsFile)) !== null) {
        customColors[match[1]] = match[2];
    }
}

// Load base colours
let colorsFile = fs.readFileSync(path.join(__dirname,"../packages/node_modules/@node-red/editor-client/src/sass/colors.scss"),"utf-8")
let updatedColors = [];

while((match = ruleRegex.exec(colorsFile)) !== null) {
    updatedColors.push(match[1]+": "+(customColors[match[1]]||match[2])+";")
}


(async function() {
    const tmpDir = os.tmpdir();
    const workingDir = await fs.mkdtemp(`${tmpDir}${path.sep}`);
    await fs.copy(path.join(__dirname,"../packages/node_modules/@node-red/editor-client/src/sass/"),workingDir)
    await fs.writeFile(path.join(workingDir,"colors.scss"),updatedColors.join("\n"))

    const result = sass.renderSync({
        outputStyle: "expanded",
        file: path.join(workingDir,"style-custom-theme.scss"),
    });

    const css = result.css.toString()
    const lines = css.split("\n");
    const colorCSS = []
    const nonColorCSS = [];

    let inKeyFrameBlock = false;

    lines.forEach(l => {
        if (inKeyFrameBlock) {
            nonColorCSS.push(l);
            if (/^}/.test(l)) {
                inKeyFrameBlock = false;
            }
        } else if (/^@keyframes/.test(l)) {
            nonColorCSS.push(l);
            inKeyFrameBlock = true;
        } else if (!/^  /.test(l)) {
            colorCSS.push(l);
            nonColorCSS.push(l);
        } else if (/color|border|background|fill|stroke|outline|box-shadow/.test(l)) {
            colorCSS.push(l);
        } else {
            nonColorCSS.push(l);
        }
    });

    const nrPkg = require("../package.json");
    const now = new Date().toISOString();

    const header = `/*
    * Theme generated with Node-RED ${nrPkg.version} on ${now}
    */`;

    var output = sass.renderSync({outputStyle: parsedArgs.long?"expanded":"compressed",data:colorCSS.join("\n")});
    if (parsedArgs.out) {

        await fs.writeFile(parsedArgs.out,header+"\n"+output.css);
    } else {
        console.log(header);
        console.log(output.css.toString());
    }
    await fs.remove(workingDir);
})()
