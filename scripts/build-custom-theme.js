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
//               css: '/path/to/file/generated/by/this/script'
//           }
//       }
//
// 5. Restart Node-RED
//



const os = require('os');
const nopt = require('nopt');
const path = require('path');
const fs = require('fs-extra');
const sass = require('sass');

const knownOpts = {
    'help': Boolean,
    'long': Boolean,
    'in': [path],
    'out': [path]
};
const shortHands = {
    '?':['--help']
};
nopt.invalidHandler = function(k,v,t) {}

const parsedArgs = nopt(knownOpts,shortHands,process.argv,2)

if (parsedArgs.help) {
    showUsageAndExit(0)
}

if (!parsedArgs.in) {
    console.warn('Missing argument: in')
    showUsageAndExit(1)
}

(async function() {
    const tmpDir = os.tmpdir();
    const workingDir = await fs.mkdtemp(`${tmpDir}${path.sep}`);

    await fs.copy(path.join(__dirname, '../packages/node_modules/@node-red/editor-client/src/sass/'), workingDir);
    await fs.copyFile(parsedArgs.in, path.join(workingDir,'colors.scss'));

    const output = sass.compile(
        path.join(workingDir, 'style-custom-theme.scss'),
        {style: parsedArgs.long === true ? 'expanded' : 'compressed'}
    );

    const nrPkg = require('../package.json');
    const now = new Date().toISOString();
    const header = `/*\n* Theme generated with Node-RED ${nrPkg.version} on ${now}\n*/`;

    if (parsedArgs.out) {
        await fs.writeFile(parsedArgs.out, header+'\n'+output.css);
    } else {
        console.log(header);
        console.log(output.css.toString());
    }

    await fs.remove(workingDir);
})()

function showUsageAndExit (exitCode) {
    console.log('');
    console.log('Usage: build-custom-theme [-?] [--in FILE] [--out FILE]');
    console.log('');
    console.log('Options:');
    console.log('  --in  FILE  Custom colors sass file');
    console.log('  --out FILE  Where you write the result');
    console.log('  --long      Do not compress the output');
    console.log('  -?, --help  Show this help');
    console.log('');
    process.exit(exitCode);
}