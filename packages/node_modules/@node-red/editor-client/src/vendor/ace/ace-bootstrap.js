
(function () {
    const bootstrapEl = document.getElementById('ace-bootstrap') || document.currentScript
    // "packages/node_modules/@node-red/editor-client/src/vendor/ace/ace.js",
    const editorScriptEl = document.createElement('script')
    editorScriptEl.src = 'vendor/ace/ace.js';
    editorScriptEl.async = false;
    bootstrapEl.parentElement.appendChild(editorScriptEl);
    // "packages/node_modules/@node-red/editor-client/src/vendor/ace/ext-language_tools.js"
    const languageToolsScriptEl = document.createElement('script')
    languageToolsScriptEl.src = 'vendor/ace/ext-language_tools.js';
    languageToolsScriptEl.async = false;
    bootstrapEl.parentElement.appendChild(languageToolsScriptEl);
})();