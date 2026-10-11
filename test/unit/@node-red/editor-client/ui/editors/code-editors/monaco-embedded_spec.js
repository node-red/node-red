const should = require("should");

const NR_TEST_UTILS = require("nr-test-utils");

const modulePath = NR_TEST_UTILS.resolve("@node-red/editor-client/src/js/ui/editors/code-editors/monaco-embedded.js");

describe("editor-client/ui/editors/code-editors/monaco-embedded", function() {
    let embedded;

    beforeEach(function() {
        global.RED = { editor: { codeEditor: {} } };
        delete require.cache[modulePath];
        embedded = require(modulePath);
    });

    afterEach(function() {
        delete global.RED;
        delete require.cache[modulePath];
    });

    const page = [
        '<div id="a">{{payload}}</div>',
        '<script src="https://example.com/lib.js"></script>',
        '<script type="application/json">{"a": 1}</script>',
        '<script>',
        'const el = document.getElementById("a")',
        'el.innerText = "{{payload}}"',
        '</script>',
        '<script type="module">import x from "./x.js"</script>',
        '<style>.a { color: red }</style>',
        '<style lang="scss">$c: blue; .b { color: $c }</style>'
    ].join("\n");

    describe("findScriptRegions", function() {
        it("finds inline JavaScript and skips src and non-JavaScript types", function() {
            const regions = embedded.findScriptRegions(page);
            regions.should.have.length(2);
            page.slice(regions[0].start, regions[0].end).should.startWith("\nconst el");
            page.slice(regions[1].start, regions[1].end).should.equal('import x from "./x.js"');
        });
    });

    describe("findStyleRegions", function() {
        it("finds style blocks and their language", function() {
            const regions = embedded.findStyleRegions(page);
            regions.map(r => r.languageId).should.eql(["css", "scss"]);
            page.slice(regions[0].start, regions[0].end).should.equal(".a { color: red }");
        });
    });

    describe("createEmbeddedDocument", function() {
        it("blanks everything outside the regions and keeps lines and columns", function() {
            const regions = embedded.findScriptRegions(page);
            const doc = embedded.createEmbeddedDocument(page, regions);
            doc.text.length.should.equal(page.length);
            doc.text.split("\n").length.should.equal(page.split("\n").length);
            doc.text.split("\n")[4].should.equal('const el = document.getElementById("a")');
            doc.text.split("\n")[0].trim().should.equal("");
            doc.text.indexOf("color").should.equal(-1);
        });
        it("replaces mustache placeholders with a same-length null", function() {
            const doc = embedded.createEmbeddedDocument(page, embedded.findScriptRegions(page), { mustache: true });
            doc.text.split("\n")[5].should.equal('el.innerText = "null       "');
            doc.text.length.should.equal(page.length);
        });
        it("leaves mustache outside the regions blank", function() {
            const doc = embedded.createEmbeddedDocument(page, embedded.findScriptRegions(page), { mustache: true });
            doc.text.split("\n")[0].trim().should.equal("");
        });
        it("inserts text and maps offsets both ways", function() {
            const text = "<script>\nexport default { a: 1 }\n</script>";
            const [region] = embedded.findScriptRegions(text);
            const open = text.indexOf("{");
            const close = text.lastIndexOf("}");
            const doc = embedded.createEmbeddedDocument(text, [region], {
                insertions: [{ at: close + 1, text: ")" }, { at: open, text: "wrap(" }],
                trailer: "\nexport {}\n"
            });
            doc.text.should.match(/^ +\nexport default wrap\(\{ a: 1 \}\)\n +\nexport \{\}\n$/);
            const a = text.indexOf("a:");
            doc.text.slice(doc.toEmbedded(a), doc.toEmbedded(a) + 2).should.equal("a:");
            doc.toHost(doc.toEmbedded(a)).should.equal(a);
            doc.toHost(doc.text.indexOf("wrap") + 1).should.equal(-1);
            doc.toHost(doc.text.indexOf("export {}")).should.equal(-1);
        });
        it("knows which offsets are inside a region", function() {
            const doc = embedded.createEmbeddedDocument(page, embedded.findScriptRegions(page));
            doc.isInRegion(page.indexOf("document.getElementById")).should.be.true();
            doc.isInRegion(page.indexOf("<div")).should.be.false();
        });
    });

    describe("usesHtmlWorker", function() {
        it("is false for languages that weren't registered with registerHTMLLanguage", function() {
            embedded.usesHtmlWorker("vue-sfc").should.be.false();
        });
    });
});
