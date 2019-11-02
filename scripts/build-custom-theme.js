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



const nopt = require("nopt");
const path = require("path");
const fs = require("fs")
const sass = require("node-sass");

const knownOpts = {
    "help": Boolean,
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
    console.log("  -?, --help  show this help");
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

const result = sass.renderSync({
    outputStyle: "expanded",
    file: path.join(__dirname,"../packages/node_modules/@node-red/editor-client/src/sass/style.scss"),
    importer: function(url, prev, done){
        if (url === 'colors') {
            return {
                contents: updatedColors.join("\n")
            }
        }
        return {file:"../packages/node_modules/@node-red/editor-client/src/sass/"+url+".scss"}
    }
});

const css = result.css.toString()
const lines = css.split("\n");
const colorCSS = []
const nonColorCSS = [];

lines.forEach(l => {
    if (!/^  /.test(l)) {
        colorCSS.push(l);
        nonColorCSS.push(l);
    } else if (/color|border|background|fill|stroke|outline|box-shadow/.test(l)) {
        colorCSS.push(l);
    } else {
        nonColorCSS.push(l);
    }
});

var output = sass.renderSync({outputStyle: "compressed",data:colorCSS.join("\n")});
if (parsedArgs.out) {
    fs.writeFileSync(parsedArgs.out,output.css);
} else {
    console.log(output.css.toString());
}
