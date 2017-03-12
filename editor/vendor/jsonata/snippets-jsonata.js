define("ace/snippets/jsonata",["require","exports","module"], function(require, exports, module) {
	"use strict";
	var snippetText = "";
	for (var fn in jsonata.functions) {
		if (jsonata.functions.hasOwnProperty(fn)) {
			snippetText += "# "+fn+"\nsnippet "+fn+"\n\t"+jsonata.getFunctionSnippet(fn)+"\n"
		}
	}
	exports.snippetText = snippetText;
	exports.scope = "jsonata";
});
