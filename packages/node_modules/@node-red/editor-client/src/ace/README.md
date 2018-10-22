How to build the custom ACE modes for Node-RED
----------------------------------------------

Node-RED includes custom JSONata and JavaScript modes.


## JSONata

The `ace/mode/jsonata` mode is maintained under `editor-client/src/vendor/jsonata`.
Those files are edited in place and copied into the build by Grunt.

## JavaScript

The `ace/mode/nrjavascript` mode is used exclusively by the Function node. It
inherits almost entirely from the normal JavaScript mode. The one key difference
is that it wraps the code with a Function before parsing. This is required to
avoid some false-flagged errors.

The source of the mode is under `editor-client/src/ace/mode`. If those files are
modified in anyway, they *must* be manually built to generate the files under
`editor-client/src/ace/bin` and checked in. Those files are the ones the Grunt
built copies out in the Node-RED build.

### Building the mode files


#### Setup build environment

    cd /tmp/
    git clone https://github.com/ajaxorg/ace.git
    cd ace
    npm install

#### Copy mode src files into build environment

    cd <node-red-source-directory
    cp packages/node_modules/@node-red/editor-client/src/ace/mode/* \
        /tmp/ace/lib/ace/mode/

#### Run the build

    cd /tmp/ace
    node ./Makefile.dryice.js -m -nc

#### Copy the built versions back

    cp build/src-min-noconflict/*-nrjavascript.js \
       <node-red-source-directory>/packages/node_modules/@node-red/editor-client/src/ace/bin/
    cp build/src-min-noconflict/snippets/nrjavascript.js \
       <node-red-source-directory>/packages/node_modules/@node-red/editor-client/src/ace/bin/snippets/
