ace.define("ace/mode/jsonata",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules","ace/worker/worker_client","ace/mode/text"], function(require, exports, module) {

    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var WorkerClient = require("../worker/worker_client").WorkerClient;
    var jsonataFunctions = Object.keys(jsonata.functions);
    // sort in length order (long->short) otherwise substringAfter gets matched
    // as substring etc.
    jsonataFunctions.sort(function(A,B) {
        return B.length-A.length;
    });
    jsonataFunctions = "("+jsonataFunctions.join("|").replace(/\$/g,"\\$")+")(\\b)";

    var JSONataHighlightRules = function() {

        var keywordMapper = this.createKeywordMapper({
            "keyword.operator":
            "and|or|in",
            "constant.language":
            "null|Infinity|NaN|undefined",
            "constant.language.boolean":
            "true|false",
            "storage.type":
            "function"
        }, "identifier");
        this.$rules = {
            "no_regex" : [
                {
                    token : "comment.doc", // doc comment
                    regex : "\\/\\*",
                    next  : "comments"
                },
                // {
                //     token: "string.regexp",
                //     regex: "\\/",
                //     next: "regex"
                // },
                {
                    token : "string",
                    regex : "'(?=.)",
                    next  : "qstring"
                },
                {
                    token : "string",
                    regex : '"(?=.)',
                    next  : "qqstring"
                },
                {
                    token : "constant.numeric", // hex
                    regex : /0(?:[xX][0-9a-fA-F]+|[bB][01]+)\b/
                },
                {
                    token : "constant.numeric", // float
                    regex : /[+-]?\d[\d_]*(?:(?:\.\d*)?(?:[eE][+-]?\d+)?)?\b/
                },
                {
                    token: "keyword",
                    regex: /λ/
                },
                {
                    token: "keyword",
                    regex: jsonataFunctions
                },
                {
                    token : keywordMapper,
                    regex : "[a-zA-Z\\$_\u00a1-\uffff][a-zA-Z\\d\\$_\u00a1-\uffff]*"
                },
                {
                    token : "punctuation.operator",
                    regex : /[.](?![.])/
                },
                {
                    token : "keyword.operator",
                    regex : /\|\||<=|>=|\.\.|\*\*|!=|:=|[=<>`!$%&*+\-~\/^]/,
                    next  : "start"
                },
                {
                    token : "punctuation.operator",
                    regex : /[?:,;.]/,
                    next  : "start"
                },
                {
                    token : "paren.lparen",
                    regex : /[\[({]/,
                    next  : "start"
                },
                {
                    token : "paren.rparen",
                    regex : /[\])}]/
                }
            ],
            "qqstring" : [
                {
                    token : "string",
                    regex : '"|$',
                    next  : "no_regex"
                },
                {
                    defaultToken: "string"
                }
            ],
            "qstring" : [
                {
                    token : "string",
                    regex : "'|$",
                    next  : "no_regex"
                },
                {
                    defaultToken: "string"
                }
            ],
            "regex" : [
                {
                    token: "string.regexp",
                    regex: "/[sxngimy]*",
                    next: "start"
                }, {
                    defaultToken: "string.regexp"
                }
            ],
            "start": [
                {
                    token : "comment.doc", // doc comment
                    regex : "\\/\\*",
                    next  : "comments"
                },
                {
                    token: "string.regexp",
                    regex: "\\/",
                    next: "regex",
                },{
                // immediately return to the start mode without matching
                // anything
                token: "empty",
                regex: "",
                next: "no_regex"
            }],
            "comments": [
                {
                    token : "comment.doc", // doc comment
                    regex : "\\*\\/",
                    next  : "start"
                },
                {
                    defaultToken: "comment.doc"
                }
            ]
        };
    };

    oop.inherits(JSONataHighlightRules, TextHighlightRules);

    var TextMode = require("./text").Mode;
    var Mode = function() {
        this.HighlightRules = JSONataHighlightRules;
    };
    oop.inherits(Mode, TextMode);


    (function() {
        this.createWorker = function(session) {
            var worker = new WorkerClient(["ace"], "ace/mode/jsonata_worker", "JSONataWorker");
            worker.attachToDocument(session.getDocument());

            worker.on("annotate", function(e) {
                session.setAnnotations(e.data);
            });

            worker.on("terminate", function() {
                session.clearAnnotations();
            });

            return worker;
        };
        this.$id = "ace/mode/jsonata";
    }).call(Mode.prototype);

    exports.Mode = Mode;

});
