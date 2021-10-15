How to build the custom MONACO editor Node-RED
----------------------------------------------

### Building monaco


#### Setup build environment

    cd /tmp/
    git clone https://github.com/node-red/nr-monaco-build.git


#### Run the build

    cd /tmp/nr-monaco-build
    npm install
    npm build

#### Copy the built versions back

    cd /tmp/nr-monaco-build
    cp -r output/monaco/dist \
        <node-red-source-directory>/packages/node_modules/@node-red/editor-client/src/vendor/monaco/

    cd /tmp/nr-monaco-build
    cp -r output/types \
        <node-red-source-directory>/packages/node_modules/@node-red/editor-client/src/
