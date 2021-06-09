node and node-red types for intellisense for monaco
---------------------------------------------------

node-js and node-red types are included in node-red for monaco and any other editor to provide intellisense in the code editor

as node-js v14 is the default recommended target as of writing, the most popular node-js types (see below) have been taken from most up-to-date types from `@types/node` and minified using `dts-minify`

* buffer.d.ts
* console.d.ts
* crypto.d.ts
* fs.d.ts
* globals.d.ts
* http.d.ts
* net.d.ts
* os.d.ts
* process.d.ts
* querystring.d.ts
* string_decoder.d.ts
* url.d.ts
* zlib.d.ts

These are placed in `node_modules/@node-red/editor-client/src/` 

The grunt task will place this default set of typings in `node_modules/@node-red/editor-client/public/types/` for consumption by the code editor.

# Instructions

See packages/node_modules/@node-red/editor-client/src/vendor/monaco/README.md


# Alternative / Manual Installation

* `npm install --save @types/node@14.14.43`
* (optional) minify using `dts-minify`
* copy files from `node_modules/@node-red/editor-client/src/` to `(node-red-src)/packages/node_modules/@node-red/editor-client/src/types/node`
* update types for node-red in files to match src definitions... 
    * (node-red-src)/packages/node_modules/@node-red/editor-client/src/types/node-red/func.d.ts
    * (node-red-src)/packages/node_modules/@node-red/editor-client/src/types/node-red/util.d.ts

