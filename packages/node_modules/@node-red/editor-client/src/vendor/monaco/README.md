How to build the custom MONACO editor Node-RED
----------------------------------------------

### Building monaco


#### Setup build environment

    cd /tmp/
    git clone https://github.com/steve-mcl/monaco-editor-esm-i18n.git


#### Run the build

    cd /tmp/monaco-editor-esm-i18n
    npm install
    npm build

#### Copy the built versions back

    cd /tmp/monaco-editor-esm-i18n
    cp -r output/monaco/dist \
        <node-red-source-directory>/packages/node_modules/@node-red/editor-client/src/vendor/monaco/

    cd /tmp/monaco-editor-esm-i18n
    cp -r output/types \
        <node-red-source-directory>/packages/node_modules/@node-red/editor-client/src/


